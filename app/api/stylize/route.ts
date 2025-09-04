/* app/api/stylize/route.ts
 * Robust JSON-only handler for uploads + Replicate, with loud server logs.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // vercel fn time cap

// ---------- helpers
const J = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const OK = (data: any) => J({ ok: true, ...data }, 200);
const FAIL = (msg: string, status = 400, extras: any = {}) =>
  J({ ok: false, error: msg, ...extras }, status);

const DEBUG = process.env.DEBUG === "1";

// ---------- env
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";
const REPLICATE_VERSION = process.env.REPLICATE_VERSION || undefined;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

async function uploadToSupabasePublic(
  file: File,
  supabase: any,
): Promise<string> {
  const name = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "jpg";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());

  // Try a simple list to surface “bucket not found” quickly
  const probe = await supabase.storage
    .from(STORAGE_BUCKET)
    .list("", { limit: 1 });
  if (probe.error && /does not exist|Not Found/i.test(probe.error.message)) {
    throw new Error(
      `Storage bucket "${STORAGE_BUCKET}" not found. Create it and add policies on storage.objects.`,
    );
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (error) {
    // RLS/policy errors show up here
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Could not obtain public URL for uploaded file");
  }
  return data.publicUrl;
}

async function replicateCreate(imageUrl: string, prompt: string) {
  const body: Record<string, any> = {
    version: REPLICATE_VERSION, // undefined is allowed
    input: { prompt, image_input: [imageUrl] },
  };

  const res = await fetch(
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

  const text = await res.text();
  if (!res.ok) {
    // Surface Replicate’s explanation to the client
    console.error("Replicate create failed:", res.status, text);
    return { error: `Replicate create failed (${res.status})`, detail: text };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Replicate create JSON parse error:", e, text);
    return { error: "Replicate create returned non-JSON", detail: text };
  }
}

async function replicateGet(id: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("Replicate get failed:", res.status, text);
    return { error: `Replicate get failed (${res.status})`, detail: text };
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Replicate get JSON parse error:", e, text);
    return { error: "Replicate get returned non-JSON", detail: text };
  }
}

// ---------- GET (health)
export async function GET(req: NextRequest) {
  const health = req.nextUrl.searchParams.get("health");
  if (health) {
    return OK({
      service: "stylize",
      storageBucket: STORAGE_BUCKET,
      supabaseUrlSet: Boolean(SUPABASE_URL),
      replicateModel: REPLICATE_MODEL,
      replicateTokenSet: Boolean(REPLICATE_API_TOKEN),
    });
  }
  return FAIL("Use POST", 405);
}

// ---------- POST (main)
export async function POST(req: NextRequest) {
  try {
    // Required env
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY)
      return FAIL("Missing Supabase env", 500);
    if (!REPLICATE_API_TOKEN) return FAIL("Missing REPLICATE_API_TOKEN", 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as any;
    const ct = req.headers.get("content-type") || "";

    let imageUrl = "";
    let prompt = "";
    let user_id: string | null = null;
    let preset_id: string | null = null;
    let preset_label: string | null = null;

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return FAIL("Missing file", 400);
      prompt = (form.get("prompt") || "").toString().trim();
      user_id = (form.get("user_id") || null) as string | null;
      preset_id = (form.get("preset_id") || null) as string | null;
      preset_label = (form.get("preset_label") || null) as string | null;

      imageUrl = await uploadToSupabasePublic(file, supabase);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}) as any);
      imageUrl = body?.imageUrl;
      prompt = (body?.prompt || "").toString().trim();
      user_id = typeof body?.user_id === "string" ? body.user_id : null;
      preset_id = typeof body?.preset_id === "string" ? body.preset_id : null;
      preset_label =
        typeof body?.preset_label === "string" ? body.preset_label : null;
      if (!isHttpsUrl(imageUrl)) {
        return FAIL("imageUrl must be a public https URL", 400);
      }
    } else {
      return FAIL("Unsupported Content-Type", 415);
    }

    if (!prompt) {
      prompt =
        "A timeless, elegant pet portrait in warm light, high detail, natural colors, fine-art quality";
    }

    // Create Replicate prediction
    const created = await replicateCreate(imageUrl, prompt);
    if (created?.error) {
      return FAIL(created.error, 422, { detail: created.detail || null });
    }
    const predictionId = created?.id as string | undefined;
    if (!predictionId) {
      return FAIL("Replicate did not return a prediction id", 502, {
        detail: created || null,
      });
    }

    // Poll Replicate
    const start = Date.now();
    const timeoutMs = 55_000;
    let outputUrl: string | null = null;

    while (Date.now() - start < timeoutMs) {
      const pred = await replicateGet(predictionId);
      if (pred?.error) {
        return FAIL("Generation failed (poll)", 502, {
          detail: pred.detail || null,
        });
      }
      const status = pred?.status;
      if (status === "succeeded" || status === "completed") {
        outputUrl = Array.isArray(pred?.output) ? pred.output[0] || null : null;
        break;
      }
      if (status === "failed" || status === "canceled") {
        return FAIL(`Generation ${status}`, 502, {
          detail:
            typeof pred?.error === "string" ? pred.error : pred?.error || null,
        });
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    if (!outputUrl) return FAIL("Timed out waiting for Replicate result", 504);

    // Persist (optional – only if you send user_id)
    if (user_id) {
      // Insert row into public.generations (match your schema)
      const insertPayload: Record<string, any> = {
        user_id,
        input_url: imageUrl,
        output_url: outputUrl,
        prompt,
        preset_id,
        preset_label,
      };
      const { error } = await supabase
        .from("generations")
        .insert(insertPayload);
      if (error) {
        // Don’t fail the whole request because of DB; just report it
        console.error("DB insert error:", error);
        return OK({
          input_url: imageUrl,
          output_url: outputUrl,
          warn: "Saved image, but could not persist generation row (RLS/policy?).",
          db_error: DEBUG ? error.message : undefined,
        });
      }
    }

    return OK({ input_url: imageUrl, output_url: outputUrl });
  } catch (err: any) {
    console.error("stylize fatal error:", err);
    return FAIL(
      "Internal error",
      500,
      DEBUG ? { stack: err?.stack, message: err?.message } : undefined,
    );
  }
}
