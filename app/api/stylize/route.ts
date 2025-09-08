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
// Removed composePrompt import - using simple approach

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

// Download and store image in Supabase Storage
async function downloadAndStoreImage(imageUrl: string, filename: string): Promise<string | null> {
  try {
    console.log(`[stylize] Downloading image from: ${imageUrl}`);
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`[stylize] Failed to download image: ${response.status}`);
      return null;
    }
    
    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('generations')
      .upload(filename, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      console.error(`[stylize] Failed to upload to storage:`, error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('generations')
      .getPublicUrl(data.path);
    
    console.log(`[stylize] Successfully stored image: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`[stylize] Error downloading/storing image:`, error);
    return null;
  }
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
async function replicateCreate(imageUrl: string, prompt: string, cropRatio?: string) {
  // IMPORTANT: image_input as an ARRAY (fix for 422)
  const body: any = {
    input: {
      image_input: [imageUrl], // <-- key fix
      prompt,
    },
  };
  
  // Try Replicate API parameter approach with better debugging
  if (cropRatio && cropRatio !== "1_1") {
    const replicateCropRatio = cropRatio.replace("_", ":");
    body.input.crop_ratio = replicateCropRatio;
    console.log(`[stylize] Using Replicate API crop_ratio parameter: ${replicateCropRatio}`);
  } else {
    console.log(`[stylize] Using default crop ratio (1:1) - no API parameter needed`);
  }
  
  console.log(`[stylize] Complete request body to Replicate:`, JSON.stringify(body, null, 2));

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
  console.log(`[stylize] Replicate API response status: ${res.status}`);
  console.log(`[stylize] Replicate API response body:`, text);
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
    const basePrompt = (form.get("prompt") || "").toString().trim() ||
      "transform this into a pet head-and-shoulders portrait, rule of thirds composition, looking at camera; PRESERVE the original animal type - if it's a dog, keep it as a dog; if it's a cat, keep it as a cat; only convert humans to pets; preserve the original pose and composition; realistic breed, unique markings, fur texture and eye color; respect the original pose and proportions; no changes to anatomy. fine-art studio photograph, 85mm lens look, shallow depth of field (f/1.8), soft key + subtle rim light, gentle bokeh, high detail, crisp facial features. Style: Dramatic fine-art portrait of a pet, against an ornate background in a cozy home, lit in rich cinematic lighting. Inspired by Annie Leibovitz, elegant, intricate details, painterly yet realistic, ultra high quality. Avoid: no text, no watermark, no frame, no hands, no extra limbs, no second animal, no distortion, no over-saturation, no human, no person, no people.";
    
    const preset_label = (form.get("preset_label") || "").toString();
    const user_id = (form.get("user_id") || "").toString();
    const crop_ratio = (form.get("crop_ratio") || "1_1").toString();
    
    // Use simple approach: just the base prompt, let Replicate API handle crop_ratio
    const finalPrompt = basePrompt;
    
    console.log(`[stylize] Base prompt: ${basePrompt}`);
    console.log(`[stylize] Crop ratio received: ${crop_ratio}`);
    console.log(`[stylize] Final prompt: ${finalPrompt}`);
    console.log(`[stylize] Prompt length: ${finalPrompt.length} characters`);
    
    if (!file) return json({ ok: false, error: "Missing file" }, 400);

    // 1) Upload input (same as before)
    const inputUrl = await uploadToSupabasePublic(file);

    // 2) Create prediction
    const created = await replicateCreate(inputUrl, finalPrompt, crop_ratio);
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
      await new Promise((r) => setTimeout(r, 1200));
    }

    if (!outputUrl || !isHttpsUrl(outputUrl)) {
      return json({ ok: false, error: "No output URL returned" }, 500);
    }

    // 4) Download and store image in Supabase Storage (permanent storage)
    let permanentUrl = outputUrl; // Fallback to original URL
    if (SUPABASE_URL && SERVICE_ROLE) {
      const filename = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const storedUrl = await downloadAndStoreImage(outputUrl, filename);
      if (storedUrl) {
        permanentUrl = storedUrl;
        console.log(`[stylize] Using permanent storage URL: ${permanentUrl}`);
      } else {
        console.warn(`[stylize] Failed to store image, using original URL: ${outputUrl}`);
      }
    }

    // 5) Optional persistence — only if admin envs are present.
    //    Inserts a row for the Community feed.
    console.log("[stylize] About to insert into database:", {
      SUPABASE_URL: !!SUPABASE_URL,
      SERVICE_ROLE: !!SERVICE_ROLE,
      outputUrl: !!outputUrl,
      preset_label,
      preset_label_type: typeof preset_label,
      preset_label_length: preset_label?.length
    });
    
    if (SUPABASE_URL && SERVICE_ROLE) {
      try {
        const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE);
        const insertData = {
          user_id: user_id || "00000000-0000-0000-0000-000000000000", // Use provided user_id or fallback for anonymous
          output_url: permanentUrl, // Use permanent Supabase URL instead of expiring Replicate URL
          high_res_url: permanentUrl, // Use permanent Supabase URL instead of expiring Replicate URL
          preset_label: preset_label || "DEFAULT Portrait",
          display_name: null,
          website: null,
          profile_image_url: null,
        };
        console.log("[stylize] Inserting data:", insertData);
        
        const { error } = await admin.from("generations").insert(insertData);
        if (error) {
          console.error("[stylize] insert error:", error);
        } else {
          console.log("[stylize] Successfully inserted into database ✅");
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
    });
  } catch (e: any) {
    console.error("[stylize] error:", e?.message || e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
