/* app/api/stylize/route.ts — keep old working flow, fix only Replicate's input shape.
   - Uploads to Supabase Storage using your existing anon client (as before)
   - Creates + polls Replicate prediction
   - Returns { ok, input_url, output_url, prediction_id }
   - OPTIONAL: if SUPABASE_SERVICE_ROLE is set, inserts a row into public.generations
*/

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // <-- same client you were using before
import { createClient as createAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---- Minimal envs (only Replicate is required for generation)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

// Optional — ONLY used if present (won’t break if missing)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

// Small helpers
function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

// Your original upload path, same storage client/policies you already had
async function uploadToSupabasePublic(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = (file.name || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop()!.toLowerCase() : "jpg";
  const path = `public/inputs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase
    .storage
    .from("generations")
    .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) throw new Error("upload failed: " + error.message);

  const { data } = supabase.storage.from("generations").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("no public url from storage");
  return data.publicUrl;
}

// ---- Replicate REST helpers (no SDK; very stable)
async function replicateCreate(imageUrl: string, prompt: string) {
  // IMPORTANT: image_input as an ARRAY now (fix for 422)
  const body = {
    input: {
      image_input: [imageUrl], // <-- the fix
      prompt,
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
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`replicate create ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function replicateGet(id: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`replicate get ${res.status}: ${text}`);
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return json({ ok: false, error: "Missing Replicate token" }, 500);
    }

    const ct = req.headers.get("content-type") || "";
    if (!ct.startsWith("multipart/form-data")) {
      return json({ ok: false, error: "Invalid content-type" }, 400);
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") || "").toString().trim() ||
      "fine-art pet portrait, dramatic elegant lighting, high detail, 1:1";
    const preset_label = (form.get("preset_label") || "").toString();

    if (!file) return json({ ok: false, error: "Missing file" }, 400);

    // 1) Upload input (same as before)
    const inputUrl = await uploadToSupabasePublic(file);

    // 2) Create prediction
    const created = await replicateCreate(inputUrl, prompt);
    const prediction_id: string | undefined = created?.id;
    if (!prediction_id) return json({ ok: false, error: "No prediction id" }, 502);

    // 3) Poll up to ~55s
    const t0 = Date.now();
    const timeoutMs = 55_000;
    let outputUrl: string | null = null;

    while (Date.now() - t0 < timeoutMs) {
      const p = await replicateGet(prediction_id);
      const status = String(p?.status || "");

      // Normalize output
      if (Array.isArray(p?.output) && p.output.length > 0) {
        outputUrl = p.output[0]!;
      } else if (typeof p?.output === "string") {
        outputUrl = p.output;
      } else if (Array.isArray((p as any)?.urls) && (p as any).urls.length > 0) {
        outputUrl = (p as any).urls[0]!;
      }

      if (status === "succeeded" || status === "completed") break;
      if (status === "failed" || status === "canceled") {
        return json({ ok: false, error: p?.error || "Generation failed" }, 500);
      }
      await new Promise(r => setTimeout(r, 1200));
    }

    if (!outputUrl || !isHttpsUrl(outputUrl)) {
      return json({ ok: false, error: "No output URL returned" }, 500);
    }

    // 4) Optional persistence — only if admin envs are present.
    //    If not present, we skip silently (keeps your working flow intact).
    if (SUPABASE_URL && SERVICE_ROLE) {
      try {
        const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE);
        await admin.from("generations").insert({
          user_id: null,
          input_url: inputUrl,
          output_url: outputUrl,
          prompt,
          preset_label,
          is_public: true,
        });
      } catch (e) {
        console.warn("[stylize] insert skipped/failed:", (e as any)?.message || e);
      }
    }

    return json({ ok: true, prediction_id, input_url: inputUrl, output_url: outputUrl });
  } catch (e: any) {
    console.error("[stylize] error:", e?.message || e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}