/* app/api/stylize/route.ts
 * Upload to Supabase Storage (public), call Replicate nano-banana, poll, return JSON with both `output` and `urls`.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// helpers
const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (message: string, status = 400, extras: any = {}) =>
  json({ ok: false, error: message, ...extras }, status);

// env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";
const REPLICATE_VERSION = process.env.REPLICATE_VERSION || ""; // hash only (optional)
const NANO_BANANA_VERSION = process.env.NANO_BANANA_VERSION || ""; // full "owner/model:hash" allowed

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try { return new URL(s).protocol === "https:"; } catch { return false; }
}

async function uploadToSupabasePublic(file: File, supabase: SupabaseClient<any>) {
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop()!.toLowerCase() : "jpg";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) throw new Error("Upload failed: " + error.message);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get public URL");
  return data.publicUrl;
}

function buildReplicateEndpoint() {
  // Prefer explicit NANO_BANANA_VERSION like "google/nano-banana:HASH"
  if (NANO_BANANA_VERSION.includes(":")) {
    const [model, hash] = NANO_BANANA_VERSION.split(":");
    return `/models/${model}/versions/${hash}/predictions`;
  }
  // Or REPLICATE_MODEL + REPLICATE_VERSION (hash only)
  if (REPLICATE_VERSION) {
    return `/models/${REPLICATE_MODEL}/versions/${REPLICATE_VERSION}/predictions`;
  }
  // Fallback to model-level endpoint (no "version" in body)
  return `/models/${REPLICATE_MODEL}/predictions`;
}

async function replicateCreate(imageUrl: string, prompt: string) {
  const path = buildReplicateEndpoint();
  const body: Record<string, any> = { input: { image_input: [imageUrl], prompt } };
  const res = await fetch(`https://api.replicate.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    return fail(`Replicate create failed (${res.status})`, res.status, { detail: text });
  }
  let created: any = {};
  try { created = JSON.parse(text); } catch { created = {}; }
  if (!created?.id) {
    return fail("Replicate did not return a prediction id", 502, { detail: text });
  }
  return ok({
    prediction_id: created.id,
    status: created.status,
    input_url: imageUrl,
  });
}

async function replicateGet(id: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return fail(`Replicate get failed (${res.status})`, res.status, { detail: await res.text() });
  }
  const pred = await res.json();
  return ok({
    status: pred?.status,
    urls: Array.isArray(pred?.output) ? pred.output : [],
    error: pred?.error ?? null,
    raw: pred,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return fail("Missing Supabase config", 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as SupabaseClient<any>;
    const ct = req.headers.get("content-type") || "";

    let imageUrl = "";
    let prompt = "";

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return fail("Missing file", 400);
      prompt = (form.get("prompt") || "").toString().trim();
      imageUrl = await uploadToSupabasePublic(file, supabase);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}));
      imageUrl = body?.imageUrl;
      prompt = (body?.prompt || "").toString().trim();
      if (!isHttpsUrl(imageUrl)) return fail("imageUrl must be a public https URL", 400);
    } else {
      return fail("Unsupported Content-Type", 415);
    }

    if (!prompt) prompt = "Elegant, cozy studio portrait of a pet, high quality.";

    // Create prediction
    const createdRes = await replicateCreate(imageUrl, prompt);
    const created = await createdRes.json();
    if (!created.ok) return createdRes; // already a fail()

    const id = created.prediction_id as string;
    const start = Date.now();
    const timeoutMs = 55_000;
    let urls: string[] = [];

    while (Date.now() - start < timeoutMs) {
      const poll = await replicateGet(id);
      const polled = await poll.json();
      if (!polled.ok) return poll; // surface error
      if (polled.status === "succeeded" || polled.status === "completed") {
        urls = polled.urls || [];
        break;
      }
      if (polled.status === "failed" || polled.status === "canceled") {
        return fail(`Generation failed`, 502, { detail: polled.error });
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    if (!urls || urls.length === 0) {
      return fail("Timed out or no output", 504);
    }

    // Return both shapes: `output` (first) and `urls` (array)
    return ok({ output: urls[0], urls });
  } catch (e: any) {
    console.error("[stylize fatal error]", e);
    return fail(e?.message || "Unknown error", 500);
  }
}