/* app/api/stylize/route.ts */
import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (msg: string, status = 400, extra: any = {}) =>
  json({ ok: false, error: msg, ...extra }, status);

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try { return new URL(s).protocol === "https:"; } catch { return false; }
}

async function uploadToSupabasePublic(
  file: File,
  supabase: SupabaseClient<any>
): Promise<string> {
  const safe = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safe.includes(".") ? safe.split(".").pop()!.toLowerCase() : "jpg";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) throw new Error("Upload failed: " + error.message);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get public URL");
  return data.publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return fail("Missing Supabase config", 500);

    const ct = req.headers.get("content-type") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as SupabaseClient<any>;

    let prompt = "";
    let imageUrl = "";
    let preset_label: string | null = null;

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return fail("Missing file", 400);
      prompt = (form.get("prompt") || "").toString().trim();
      preset_label = (form.get("preset_label") || null) as string | null;
      imageUrl = await uploadToSupabasePublic(file, supabase);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}));
      prompt = (body?.prompt || "").toString().trim();
      imageUrl = body?.imageUrl;
      preset_label = typeof body?.preset_label === "string" ? body.preset_label : null;
      if (!isHttpsUrl(imageUrl)) return fail("imageUrl must be a public https URL", 400);
    } else {
      return fail("Unsupported Content-Type", 415);
    }

    if (!prompt) {
      prompt = "A timeless, elegant pet portrait in warm light, high detail, 1:1";
    }

    const createRes = await fetch(
      `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: { prompt, image_input: [imageUrl] } }),
      }
    );

    const text = await createRes.text();
    if (!createRes.ok) {
      return fail(`Replicate create failed (${createRes.status})`, createRes.status, { detail: text });
    }
    const created = JSON.parse(text);
    const prediction_id = created?.id as string | undefined;
    if (!prediction_id) return fail("Replicate did not return a prediction id", 502, { detail: created });

    return ok({ prediction_id, input_url: imageUrl, preset_label });
  } catch (e: any) {
    console.error("stylize fatal error:", e);
    return fail(e?.message || "Unknown error", 500);
  }
}

export async function GET() {
  return fail("Use POST", 405);
}
