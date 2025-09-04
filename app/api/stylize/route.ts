/* app/api/stylize/route.ts
 * Upload (multipart or JSON URL) -> Supabase public URL (if needed) -> Replicate create
 * Returns JSON: { ok, prediction_id, status, input_url }
 */

import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- helpers
const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (data: any) => json({ ok: true, ...data }, 200);
const fail = (message: string, status = 400, extras: any = {}) =>
  json({ ok: false, error: message, ...extras }, status);

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

// ---- env
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
// NOTE: Do not send version in payload (it caused 422 for this model). We keep
// the env for reference/override but don't include it in the POST body.
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

// Upload a File to Supabase storage and return public https URL
async function uploadToSupabasePublic(
  file: File,
  supabase: SupabaseClient<any>
): Promise<string> {
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop()!.toLowerCase() : "jpg";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, { contentType: file.type || "image/jpeg", upsert: false });

  if (upErr) {
    throw new Error("Upload failed: " + (upErr.message || "unknown error"));
  }

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl || !isHttpsUrl(pub.publicUrl)) {
    throw new Error("Could not obtain public URL for upload");
  }
  return pub.publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return fail("Missing Supabase config", 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as SupabaseClient<any>;
    const ct = req.headers.get("content-type") || "";

    let imageUrl = "";
    let prompt = "";
    // Optional passthrough (not required here): user_id, preset info, etc.
    // We keep accepting them to stay compatible with your UI.
    let user_id: string | null = null;
    let preset_label: string | null = null;

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return fail("Missing file", 400);
      prompt = String(form.get("prompt") || "").trim();
      user_id = (form.get("user_id") || null) as string | null;
      preset_label = (form.get("preset_label") || null) as string | null;

      // Upload the binary to Supabase to make a public https URL for Replicate
      imageUrl = await uploadToSupabasePublic(file, supabase);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}));
      prompt = String(body?.prompt || "").trim();
      imageUrl = String(body?.imageUrl || "");
      user_id = typeof body?.user_id === "string" ? body.user_id : null;
      preset_label = typeof body?.preset_label === "string" ? body.preset_label : null;

      if (!isHttpsUrl(imageUrl)) {
        return fail("imageUrl must be a public https URL", 400);
      }
    } else {
      return fail("Unsupported Content-Type", 415);
    }

    if (!prompt) {
      // keep a safe default so the model always has instruction
      prompt =
        "Fine-art pet portrait, elegant composition, warm studio light, high detail, tasteful color grading";
    }

    // Replicate: create prediction (do NOT include "version" here)
    const createBody: any = {
      input: {
        prompt,
        image_input: [imageUrl],
      },
    };

    const res = await fetch(
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

    const text = await res.text();
    if (!res.ok) {
      return fail(`Replicate create failed (${res.status})`, res.status, { detail: text });
    }

    let created: any = {};
    try {
      created = JSON.parse(text);
    } catch {
      return fail("Invalid JSON from Replicate create", 502, { detail: text.slice(0, 400) });
    }

    if (!created?.id) {
      return fail("Replicate did not return a prediction id", 502, { detail: created });
    }

    // Minimal response; the client will poll /api/predictions/:id
    return ok({
      service: "stylize",
      prediction_id: created.id as string,
      status: created.status,
      input_url: imageUrl,
      user_id,
      preset_label,
    });
  } catch (e: any) {
    console.error("[stylize] fatal error:", e);
    return fail(e?.message || "Unknown error", 500);
  }
}

export async function GET() {
  return fail("Use POST", 405);
}
