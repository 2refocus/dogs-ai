/* app/api/stylize/route.ts
 * Server-side upload to Supabase (service key) + Replicate create/poll + JSON-only responses
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
const REPLICATE_VERSION = process.env.REPLICATE_VERSION || undefined; // optional

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "generations";

// Clients
const supabaseAnon = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
) as SupabaseClient<any>;
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
) as SupabaseClient<any>;

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

async function uploadToSupabasePublic(file: File): Promise<string> {
  // Path: generations/uploads/<timestamp>-<rand>.<ext>
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".")
    ? safeName.split(".").pop()!.toLowerCase()
    : "jpg";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());

  // Use ADMIN client -> bypasses Storage RLS (server-only)
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error("Upload failed: " + error.message);

  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get public URL for upload");
  return data.publicUrl;
}

async function replicateCreate(imageUrl: string, prompt: string) {
  const body: Record<string, any> = {
    // If you have a specific version ID, set REPLICATE_VERSION
    version: REPLICATE_VERSION,
    input: {
      prompt,
      image_input: [imageUrl], // MUST be a public https URL
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
      body: JSON.stringify(body),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    // surface replicate’s detail to client for debugging
    return fail(`Replicate create failed (${res.status})`, res.status, {
      detail: text,
    });
  }

  let created: any = {};
  try {
    created = JSON.parse(text);
  } catch {
    return fail("Replicate returned non-JSON response", 502, { detail: text });
  }

  if (!created?.id) {
    return fail("Replicate did not return a prediction id", 502, {
      detail: text,
    });
  }

  return ok({
    prediction_id: created.id,
    status: created.status,
    raw: created,
  });
}

async function replicateGet(id: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    return fail(`Replicate get failed (${res.status})`, res.status, {
      detail: text,
    });
  }
  try {
    return ok({ raw: JSON.parse(text) });
  } catch {
    return fail("Replicate get returned non-JSON", 502, { detail: text });
  }
}

export async function POST(req: NextRequest) {
  // quick config sanity response for debugging
  if (!REPLICATE_API_TOKEN) return fail("Missing REPLICATE_API_TOKEN", 500);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return fail("Missing Supabase config", 500);
  }

  try {
    const ct = req.headers.get("content-type") || "";

    let imageUrl = "";
    let prompt = "";
    let user_id: string | null = null;
    let preset_label: string | null = null;

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return fail("Missing file", 400);

      prompt = (form.get("prompt") || "").toString().trim();
      user_id = (form.get("user_id") || null) as string | null;
      preset_label = (form.get("preset_label") || null) as string | null;

      // Upload to Storage (service client)
      imageUrl = await uploadToSupabasePublic(file);
    } else if (ct.startsWith("application/json")) {
      const body = await req.json().catch(() => ({}));
      imageUrl = body?.imageUrl;
      prompt = (body?.prompt || "").toString().trim();
      user_id = typeof body?.user_id === "string" ? body.user_id : null;
      preset_label =
        typeof body?.preset_label === "string" ? body.preset_label : null;
      if (!isHttpsUrl(imageUrl)) {
        return fail("imageUrl must be a public https URL", 400);
      }
    } else {
      return fail("Unsupported Content-Type", 415);
    }

    if (!prompt) {
      prompt =
        "A timeless, elegant pet portrait in warm light, detailed and high quality, fine studio look";
    }

    // Create prediction
    const createdRes = await replicateCreate(imageUrl, prompt);
    if (!("ok" in (createdRes as any)) || !(createdRes as any).ok)
      return createdRes;
    const { prediction_id } = (await createdRes.json()) as any;

    // Poll up to ~55s
    const start = Date.now();
    const timeoutMs = 55_000;
    let outputUrl: string | null = null;
    let status: string | undefined = undefined;

    while (Date.now() - start < timeoutMs) {
      const pollRes = await replicateGet(prediction_id);
      if (!("ok" in (pollRes as any)) || !(pollRes as any).ok) return pollRes;
      const { raw } = (await pollRes.json()) as any;

      status = raw?.status;
      if (status === "succeeded" || status === "completed") {
        const out = Array.isArray(raw?.output) ? raw.output : [];
        outputUrl = out[0] || null;
        break;
      }
      if (status === "failed" || status === "canceled") {
        const errMsg =
          typeof raw?.error === "string"
            ? raw.error
            : JSON.stringify(raw?.error || {});
        return fail(`Generation failed: ${errMsg}`, 502);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    if (!outputUrl) return fail("Timed out waiting for Replicate result", 504);

    // Optional: persist to DB (service client to avoid RLS insert failures)
    // We only save if user_id is present (signed-in users). Free anon runs won’t be saved.
    let rowId: string | null = null;
    if (user_id) {
      const { data, error } = await supabaseAdmin
        .from("generations")
        .insert({
          user_id,
          input_url: imageUrl,
          output_url: outputUrl,
          prompt,
          preset_label,
        })
        .select("id")
        .single();

      if (!error && data?.id) rowId = data.id as string;
    }

    return ok({
      id: rowId,
      status,
      input_url: imageUrl,
      output_url: outputUrl,
    });
  } catch (e: any) {
    console.error("stylize fatal error:", e);
    return fail(e?.message || "Unknown error", 500);
  }
}

export async function GET() {
  // helpful ping for debugging environment on production
  return ok({
    service: "stylize",
    storageBucket: STORAGE_BUCKET,
    supabaseUrlSet: Boolean(SUPABASE_URL),
    replicateModel: REPLICATE_MODEL,
    replicateTokenSet: Boolean(REPLICATE_API_TOKEN),
  });
}
