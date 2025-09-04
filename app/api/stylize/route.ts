// app/api/stylize/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";
const REPLICATE_VERSION = process.env.REPLICATE_VERSION || undefined;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "images"; // make sure this bucket exists & is public

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const fail = (msg: string, status = 400, extra: any = {}) =>
  json({ ok: false, error: msg, ...extra }, status);
const ok = (data: any) => json({ ok: true, ...data });

function isHttpsUrl(x: unknown): x is string {
  if (typeof x !== "string") return false;
  try {
    return new URL(x).protocol === "https:";
  } catch {
    return false;
  }
}

async function uploadToSupabasePublic(
  file: File,
  supabase: ReturnType<typeof createClient>,
) {
  const safe = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safe.includes(".") ? safe.split(".").pop()!.toLowerCase() : "jpg";
  const key = `inputs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(key, buf, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (error) throw new Error("Upload failed: " + error.message);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  if (!data?.publicUrl) throw new Error("Could not get public URL");
  return data.publicUrl;
}

async function createReplicatePrediction(imageUrl: string, prompt: string) {
  const body: Record<string, any> = {
    version: REPLICATE_VERSION,
    input: { image_input: [imageUrl], prompt },
  };

  const r = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const t = await r.text(); // capture details for debugging
  if (!r.ok) {
    return fail(`Replicate create failed (${r.status})`, r.status, {
      detail: t,
    });
  }

  let created: any = {};
  try {
    created = JSON.parse(t);
  } catch {
    /* shouldn't happen, but keep defensive */
  }
  if (!created?.id) {
    return fail("Replicate did not return a prediction id", 502, { detail: t });
  }
  return ok({ prediction_id: created.id, status: created.status });
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY)
      return fail("Missing Supabase env", 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const ct = req.headers.get("content-type") || "";

    let imageUrl = "";
    let prompt = "";

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      prompt = (form.get("prompt") || "").toString().trim();
      if (!file) return fail("Missing file", 400);
      imageUrl = await uploadToSupabasePublic(file, supabase);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}));
      imageUrl = body?.imageUrl;
      prompt = (body?.prompt || "").toString().trim();
      if (!isHttpsUrl(imageUrl))
        return fail("imageUrl must be a public https URL", 400);
    } else {
      return fail("Unsupported Content-Type", 415);
    }

    if (!prompt) {
      prompt = "Elegant pet portrait, high quality, warm light";
    }

    return await createReplicatePrediction(imageUrl, prompt);
  } catch (e: any) {
    return fail(e?.message || "Unknown error", 500);
  }
}

export async function GET() {
  return fail("Use POST", 405);
}
