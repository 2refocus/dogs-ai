/* app/api/stylize/route.ts
 * Non-blocking: upload -> create Replicate prediction -> return prediction_id
 * Client should poll /api/predictions/[id] for status/output.
 */
import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";
// Prefer hash-only in REPLICATE_VERSION; if not present, you can set NANO_BANANA_VERSION to "google/nano-banana:<hash>"
const REPLICATE_VERSION = process.env.REPLICATE_VERSION;
const NANO_BANANA_VERSION = process.env.NANO_BANANA_VERSION;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (msg: string, status = 400, extra: any = {}) => json({ ok: false, error: msg, ...extra }, status);

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try { return new URL(s).protocol === "https:"; } catch { return false; }
}

async function uploadToSupabasePublic(file: File, supabase: SupabaseClient<any>) {
  const safe = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safe.includes(".") ? safe.split(".").pop()!.toLowerCase() : "jpg";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("Upload failed: " + error.message);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get public URL for upload");
  return data.publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return fail("Missing Supabase config", 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as SupabaseClient<any>;
    const ct = req.headers.get("content-type") || "";

    let prompt = "";
    let imageUrl = "";

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      prompt = (form.get("prompt") || "").toString().trim();
      if (!file) return fail("Missing file", 400);
      imageUrl = await uploadToSupabasePublic(file, supabase);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}));
      prompt = (body?.prompt || "").toString().trim();
      imageUrl = body?.imageUrl;
      if (!isHttpsUrl(imageUrl)) return fail("imageUrl must be a public https URL", 400);
    } else {
      return fail("Unsupported Content-Type", 415);
    }

    if (!prompt) prompt = "Fine-art pet portrait, warm light, detailed, elegant, 1:1 crop";

    // Build create body:
    const createBody: Record<string, any> = {
      input: { prompt, image_input: [imageUrl] },
    };

    let endpoint = "https://api.replicate.com/v1/models/" + REPLICATE_MODEL + "/predictions";
    // If version hash is provided, switch to /v1/predictions and pass {version}
    const versionHash = (REPLICATE_VERSION && REPLICATE_VERSION.includes(":") ? REPLICATE_VERSION.split(":").pop() : REPLICATE_VERSION) 
      || (NANO_BANANA_VERSION && NANO_BANANA_VERSION.split(":").pop()) 
      || null;
    if (versionHash) {
      endpoint = "https://api.replicate.com/v1/predictions";
      createBody.version = versionHash;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });

    const text = await res.text();
    if (!res.ok) {
      return fail(`Replicate create failed (${res.status})`, res.status, { detail: text });
    }

    const created = JSON.parse(text);
    if (!created?.id) return fail("Replicate did not return a prediction id", 502, { detail: text });

    // Non-blocking return: client will poll
    return ok({
      prediction_id: created.id,
      status: created.status,
      input_url: imageUrl,
    });
  } catch (e: any) {
    return fail(e?.message || "Unknown error", 500);
  }
}
