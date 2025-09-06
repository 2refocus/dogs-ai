/* app/api/stylize/route.ts — keep old working flow, fix only Replicate's input shape.
   - Uploads to Supabase Storage using your existing anon client (as before)
   - Creates + polls Replicate prediction
   - Returns { ok, input_url, output_url, prediction_id }
   - OPTIONAL: if SUPABASE_SERVICE_ROLE is set, inserts a row into public.generations
*/

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // <-- same client you were using before
import { createClient as createAdmin } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---- Minimal envs (only Replicate is required for generation)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

// Optional — ONLY used if present (won’t break if missing)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Small helpers
function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

// Get user ID from Authorization header, fallback to anonymous UUID
async function getUserId(req: NextRequest): Promise<string> {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return "00000000-0000-0000-0000-000000000000"; // Anonymous UUID
    
    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userData?.user) return "00000000-0000-0000-0000-000000000000"; // Anonymous UUID
    
    return userData.user.id;
  } catch {
    return "00000000-0000-0000-0000-000000000000"; // Anonymous UUID
  }
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
async function replicateCreate(imageUrl: string, basePrompt: string, options: { crop_ratio?: string; num_outputs?: number } = {}) {
  // Add crop ratio to prompt if specified
  const cropRatioText = options.crop_ratio ? `, ${options.crop_ratio} aspect ratio` : "";
  const prompt = `${basePrompt}${cropRatioText}`;
  // Parse crop ratio (e.g., "16:9" -> 1.777...)
  let aspect_ratio = 1;
  if (options.crop_ratio) {
    const [width, height] = options.crop_ratio.split(":").map(Number);
    if (width && height) {
      aspect_ratio = width / height;
    }
  }

  // Set dimensions and parameters based on whether we want to force aspect ratio
  const body = {
    input: {
      image_input: [imageUrl],
      prompt: `${prompt}, professional studio portrait, ultra high quality, sharp focus, 8k uhd`,
      negative_prompt: "blurry, low quality, distorted, deformed, disfigured, bad anatomy, watermark, pixelated, jpeg artifacts, oversaturated",
      width: 1024,
      height: 1024,
      guidance_scale: 7.5,
      num_inference_steps: 50,
      scheduler: "DPMSolverMultistep",
      num_outputs: options.num_outputs || 1,
    },
  };

  // Only modify dimensions if crop ratio is explicitly requested
  if (options.crop_ratio) {
    console.log("[stylize] applying crop ratio:", options.crop_ratio);
    const [w, h] = options.crop_ratio.split(":").map(Number);
    if (w && h) {
      if (w > h) {
        body.input.width = 1536;  // Larger width for landscape
        body.input.height = Math.round((h * 1536) / w);
      } else if (h > w) {
        body.input.height = 1536;  // Larger height for portrait
        body.input.width = Math.round((w * 1536) / h);
      } else {
        body.input.width = 1536;  // Square
        body.input.height = 1536;
      }
      // Add aspect ratio to prompt
      body.input.prompt = `${body.input.prompt}, ${options.crop_ratio} aspect ratio`;
    }
  }

  console.log("[stylize] final request:", body);

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

    // Get user ID (authenticated user or "anonymous" for free users)
    const userId = await getUserId(req);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = (form.get("prompt") || "").toString().trim() ||
      "fine-art pet portrait, dramatic elegant lighting, high detail";
    const preset_label = (form.get("preset_label") || "").toString();
    const user_url = (form.get("user_url") || "").toString().trim();
    const display_name = (form.get("display_name") || "").toString().trim();

    if (!file) return json({ ok: false, error: "Missing file" }, 400);

    // 1) Upload input (same as before)
    const inputUrl = await uploadToSupabasePublic(file);

    // 2) Create prediction
    // Get premium parameters
    const num_outputs = parseInt(form.get("num_outputs")?.toString() || "1", 10);
    const crop_ratio = form.get("crop_ratio")?.toString();

    // Create prediction with options
    const options: { num_outputs: number; crop_ratio?: string } = {
      num_outputs: num_outputs || 1
    };
    
    // Only include crop_ratio if explicitly provided
    if (crop_ratio) {
      options.crop_ratio = crop_ratio;
    }
    
    const created = await replicateCreate(inputUrl, prompt, options);
    const prediction_id: string | undefined = created?.id;
    if (!prediction_id) return json({ ok: false, error: "No prediction id" }, 502);

    // 3) Poll up to ~55s
    const t0 = Date.now();
    const timeoutMs = 55_000;
    let outputUrl: string | null = null;
    let highResUrl: string | null = null;

    while (Date.now() - t0 < timeoutMs) {
      const p = await replicateGet(prediction_id);
      const status = String(p?.status || "");

      // Normalize output - now handling both preview and high-res URLs
      let previewUrl = null;

      if (Array.isArray(p?.output) && p.output.length > 0) {
        outputUrl = p.output[0];
        highResUrl = p.output[0];  // Same URL for now, since we're generating high quality in one step
      } else if (typeof p?.output === "string") {
        outputUrl = p.output;
        highResUrl = p.output;
      } else if (Array.isArray((p as any)?.urls) && (p as any).urls.length > 0) {
        outputUrl = (p as any).urls[0];
        highResUrl = (p as any).urls[0];
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

    // 4) Always save to database for community feed (both anonymous and authenticated users)
    if (SUPABASE_URL && SERVICE_ROLE) {
      try {
        const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE);
        const { error } = await admin.from("generations").insert({
          output_url: outputUrl,
          high_res_url: highResUrl,
          aspect_ratio: crop_ratio || null,
          preset_label,
          website: user_url || null,
          display_name: display_name || null,
          user_id: userId,  // Add back user_id for filtering in history
        });
        if (error) {
          console.error("[stylize] insert error:", error);
        } else {
          console.log(`[stylize] inserted row into generations for user: ${userId} ✅`);
        }
      } catch (e) {
        console.error("[stylize] insert exception:", e);
      }
    } else {
      console.warn("[stylize] skipped insert — missing SUPABASE_SERVICE_ROLE or URL");
    }

    return json({ 
      ok: true, 
      prediction_id, 
      input_url: inputUrl, 
      output_url: outputUrl,
      high_res_url: highResUrl
    });
  } catch (e: any) {
    console.error("[stylize] error:", e?.message || e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
