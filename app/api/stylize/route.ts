/* app/api/stylize/route.ts
 * JSON responses + Node runtime + multipart/JSON + Supabase upload + Replicate create (no version field)
 */
import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---- JSON helpers
const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (message: string, status = 400, extras: any = {}) =>
  json({ ok: false, error: message, ...extras }, status);

// ---- Env
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";
// IMPORTANT: Replicate's v1 create endpoint rejects unknown top-level keys like "version".
// We'll omit it here and rely on REPLICATE_MODEL possibly containing a tag.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try { return new URL(s).protocol === "https:"; } catch { return false; }
}

// keep typing flexible to avoid schema generic mismatch during builds
async function uploadToSupabasePublic(
  file: File,
  supabase: SupabaseClient<any>
): Promise<string> {
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop()!.toLowerCase() : "jpg";
  const path = `inputs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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

    let imageUrl = "";
    let prompt = "";
    let user_id: string | null = null;
    let preset_id: string | null = null;
    let preset_label: string | null = null;

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return fail("Missing file", 400);
      prompt = (form.get("prompt") || "").toString().trim();
      user_id = (form.get("user_id") || null) as string | null;
      preset_id = (form.get("preset_id") || null) as string | null;
      preset_label = (form.get("preset_label") || null) as string | null;
      imageUrl = await uploadToSupabasePublic(file, supabase);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}));
      imageUrl = body?.imageUrl;
      prompt = (body?.prompt || "").toString().trim();
      user_id = typeof body?.user_id === "string" ? body.user_id : null;
      preset_id = typeof body?.preset_id === "string" ? body.preset_id : null;
      preset_label = typeof body?.preset_label === "string" ? body.preset_label : null;
      if (!isHttpsUrl(imageUrl)) return fail("imageUrl must be a public https URL", 400);
    } else {
      return fail("Unsupported Content-Type", 415);
    }

    if (!prompt) {
      prompt =
        "A timeless, elegant pet portrait in warm light, detailed and high quality";
    }

    // Replicate: create prediction (no "version" top-level key)
    const createBody: Record<string, any> = {
      input: { prompt, image_input: [imageUrl] },
    };
    const createRes = await fetch(
      `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      }
    );
    const createText = await createRes.text();
    if (!createRes.ok) {
      return fail(
        `Replicate create failed (${createRes.status})`,
        createRes.status,
        { detail: createText }
      );
    }
    let created: any = {};
    try { created = JSON.parse(createText); } catch {
      return fail("Unexpected Replicate response", 502, { detail: createText });
    }
    if (!created?.id) {
      return fail("Replicate did not return a prediction id", 502, { detail: createText });
    }

    // Return the id to be polled by /api/predictions/[id]
    return ok({
      prediction_id: created.id,
      status: created.status,
      input_url: imageUrl,
    });
  } catch (err: any) {
    return fail(err?.message || "Unknown error", 500);
  }
}

export async function GET() {
  // Small health check endpoint
  return ok({
    service: "stylize",
    storageBucket: STORAGE_BUCKET,
    supabaseUrlSet: Boolean(SUPABASE_URL),
    replicateModel: REPLICATE_MODEL,
    replicateTokenSet: Boolean(REPLICATE_API_TOKEN),
  });
}
