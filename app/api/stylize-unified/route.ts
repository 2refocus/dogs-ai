// app/api/stylize-unified/route.ts
// Unified API that can use different pipeline modes

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { processWithMultiModelPipeline } from "@/lib/multiModelPipeline";
import { buildReplicatePrompt, optimizePromptForReplicate } from "@/lib/replicatePipeline";
import { getRecommendedPipeline, PipelineMode, MODEL_SETTINGS } from "@/lib/pipelineConfig";
import { selectPipelineForRequest, getUserTier } from "@/lib/pipelineStrategy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for multi-model pipeline

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
import { MODEL_SETTINGS } from "@/lib/pipelineConfig";
const REPLICATE_MODEL = MODEL_SETTINGS["nano-banana"].model;

// Helper functions (same as original API)
function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
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

// Download and store image in Supabase Storage (same as original API)
async function downloadAndStoreImage(imageUrl: string, filename: string): Promise<string | null> {
  try {
    console.log(`[stylize-unified] Downloading image from: ${imageUrl}`);
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`[stylize-unified] Failed to download image: ${response.status}`);
      return null;
    }
    
    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);
    
    // Upload to Supabase Storage
    const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await admin.storage
      .from('generations')
      .upload(filename, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      console.error(`[stylize-unified] Storage upload error:`, error);
      return null;
    }
    
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/generations/${filename}`;
    console.log(`[stylize-unified] Image stored successfully: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error(`[stylize-unified] Error downloading/storing image:`, error);
    return null;
  }
}

// Upscaling function using Real-ESRGAN
async function upscaleWithRealESRGAN(imageUrl: string, scale: number = 2): Promise<string> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }

  console.log(`[stylize-unified] Upscaling image: ${imageUrl} with scale: ${scale}x`);

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nightmareai/real-esrgan",
      input: {
        image: imageUrl,
        scale: scale,
        face_enhance: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Real-ESRGAN API error: ${response.status}`);
  }

  const prediction = await response.json();
  const predictionId = prediction.id;

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    
    const result = await pollResponse.json();
    
    if (result.status === "succeeded") {
      const upscaledUrl = result.output;
      console.log(`[stylize-unified] Upscaling completed: ${upscaledUrl}`);
      
      // Download and store the upscaled image
      const filename = `upscaled-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const storedUrl = await downloadAndStoreImage(upscaledUrl, filename);
      
      return storedUrl || upscaledUrl; // Fallback to original URL if storage fails
    }
    
    if (result.status === "failed") {
      throw new Error(`Upscaling failed: ${result.error}`);
    }
    
    attempts++;
  }

  throw new Error("Upscaling timeout");
}

// Alternative upscaling with SwinIR for higher resolution
async function upscaleWithSwinIR(imageUrl: string): Promise<string> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }

  console.log(`[stylize-unified] Upscaling with SwinIR: ${imageUrl}`);

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jingyunliang/swinir",
      input: {
        image: imageUrl,
        task_type: "Real-World Image Super-Resolution-Large",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`SwinIR API error: ${response.status}`);
  }

  const prediction = await response.json();
  const predictionId = prediction.id;

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 90; // 90 seconds max for SwinIR

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    
    const result = await pollResponse.json();
    
    if (result.status === "succeeded") {
      const upscaledUrl = result.output;
      console.log(`[stylize-unified] SwinIR upscaling completed: ${upscaledUrl}`);
      
      // Download and store the upscaled image
      const filename = `swinir-upscaled-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const storedUrl = await downloadAndStoreImage(upscaledUrl, filename);
      
      return storedUrl || upscaledUrl; // Fallback to original URL if storage fails
    }
    
    if (result.status === "failed") {
      throw new Error(`SwinIR upscaling failed: ${result.error}`);
    }
    
    attempts++;
  }

  throw new Error("SwinIR upscaling timeout");
}

// Upload function
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

// Simple pipeline (existing Nano-Banana approach)
async function processSimplePipeline(
  inputUrl: string,
  styleLabel: string,
  cropRatio: string
): Promise<{ imageUrl: string; model: string }> {
  const prompt = buildReplicatePrompt({
    species: "dog",
    styleLabel,
    cropRatio,
  });
  
  const optimizedPrompt = optimizePromptForReplicate(prompt, REPLICATE_MODEL);
  
  console.log(`[stylize-unified] Style label: ${styleLabel}`);
  console.log(`[stylize-unified] Original prompt: ${prompt}`);
  console.log(`[stylize-unified] Optimized prompt: ${optimizedPrompt}`);
  
  // Use existing Replicate API call
  const body: any = {
    input: {
      image_input: [inputUrl],
      prompt: optimizedPrompt,
      // Try to get higher resolution from Nano-Banana
      num_inference_steps: 50, // More steps for better quality
      guidance_scale: 7.5, // Higher guidance for better prompt following
      // Try additional parameters that might help with resolution
      scheduler: "DPMSolverMultistepScheduler", // Better scheduler for quality
      safety_tolerance: 2, // Allow more creative freedom
    },
  };
  
  if (cropRatio && cropRatio !== "1_1") {
    body.input.crop_ratio = cropRatio.replace("_", ":");
  }
  
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
  
  if (!res.ok) {
    throw new Error(`Replicate API error: ${res.status}`);
  }
  
  const prediction = await res.json();
  const prediction_id: string | undefined = prediction?.id;
  if (!prediction_id) {
    throw new Error("No prediction id");
  }

  // Poll for completion (same logic as original API)
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
      throw new Error(`Generation failed: ${p?.error || "Unknown error"}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  if (!outputUrl || !isHttpsUrl(outputUrl)) {
    throw new Error("No output URL returned");
  }

  // Download and store image in Supabase Storage (same as original API)
  let permanentUrl = outputUrl; // Fallback to original URL
  if (SUPABASE_URL && SERVICE_ROLE) {
    const filename = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const storedUrl = await downloadAndStoreImage(outputUrl, filename);
    if (storedUrl) {
      permanentUrl = storedUrl;
      console.log(`[stylize-unified] Using permanent storage URL: ${permanentUrl}`);
    } else {
      console.warn(`[stylize-unified] Failed to store image, using original URL: ${outputUrl}`);
    }
  }
  
  return {
    imageUrl: permanentUrl,
    model: "Nano-Banana",
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now(); // Track generation start time
  
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.startsWith("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "Invalid content-type" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const styleLabel = (form.get("preset_label") || "Photorealistic").toString();
    const cropRatio = (form.get("crop_ratio") || "4_5").toString();
    const user_id = (form.get("user_id") || "").toString();
    const display_name = (form.get("display_name") || "").toString();
    const user_url_raw = (form.get("user_url") || "").toString();
    
    // Pipeline selection with smart strategy
    const requestedMode = (form.get("pipeline_mode") as PipelineMode) || undefined;
    const generationMode = (form.get("generation_mode") || "auto").toString() as "fast" | "quality" | "auto";
    const forceMode = (form.get("force_mode") as PipelineMode) || undefined;

    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Ensure URL has proper protocol
    let user_url = user_url_raw;
    if (user_url_raw && !user_url_raw.startsWith('http://') && !user_url_raw.startsWith('https://')) {
      user_url = `https://${user_url_raw}`;
    }

    // Smart pipeline selection based on user tier
    const pipelineSelection = selectPipelineForRequest({
      userId: user_id || null,
      requestedMode,
      generationMode,
      forceMode,
    });

    const { selectedMode, userTier, canAccess, upgradeMessage } = pipelineSelection;

    if (!canAccess) {
      return NextResponse.json({ 
        ok: false, 
        error: "Access denied",
        upgradeMessage,
        userTier,
        requestedMode,
      }, { status: 403 });
    }

    console.log(`[stylize-unified] User: ${userTier}, Pipeline: ${selectedMode}`);
    if (upgradeMessage) {
      console.log(`[stylize-unified] Upgrade message: ${upgradeMessage}`);
    }

    // 1) Upload input image
    const inputUrl = await uploadToSupabasePublic(file);
    console.log(`[stylize-unified] Input uploaded: ${inputUrl}`);

    // 2) Process with selected pipeline
    let result: { imageUrl: string; model: string };
    
    if (selectedMode === "simple") {
      result = await processSimplePipeline(inputUrl, styleLabel, cropRatio);
    } else if (selectedMode === "multimodel") {
      // TODO: Fix IP-Adapter model ID - for now fall back to simple pipeline
      console.log("[stylize-unified] Multi-model pipeline temporarily disabled, using simple pipeline");
      result = await processSimplePipeline(inputUrl, styleLabel, cropRatio);
    } else {
      // Hybrid: Simple + upscaling
      const simpleResult = await processSimplePipeline(inputUrl, styleLabel, cropRatio);
      
      // Temporarily disable upscaling due to API issues - focus on better base resolution
      console.log("[stylize-unified] Upscaling temporarily disabled, using enhanced base resolution");
      result = simpleResult;
    }

    console.log(`[stylize-unified] Pipeline complete: ${result.model}`);

    // 3) Store in database
    if (SUPABASE_URL && SERVICE_ROLE) {
      try {
        const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE);
        const insertData = {
          user_id: user_id || "00000000-0000-0000-0000-000000000000",
          output_url: result.imageUrl,
          high_res_url: selectedMode === "multimodel" ? result.imageUrl : null, // Only set high_res_url for multi-model pipeline (upscaling disabled)
          input_url: inputUrl,
          preset_label: styleLabel,
          display_name: display_name || null,
          website: user_url || null,
          profile_image_url: null,
          // Pipeline information
          pipeline_mode: selectedMode,
          model_used: result.model,
          user_tier: userTier,
          generation_time_ms: Date.now() - startTime, // Calculate generation time
        };
        
        const { error } = await admin.from("generations").insert(insertData);
        if (error) {
          console.error("[stylize-unified] insert error:", error);
        } else {
          console.log("[stylize-unified] Successfully inserted into database ✅");
        }
      } catch (e) {
        console.error("[stylize-unified] insert exception:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      input_url: inputUrl,
      output_url: result.imageUrl,
      model: result.model,
      pipeline_mode: selectedMode,
      user_tier: userTier,
      style: styleLabel,
      crop_ratio: cropRatio,
      upgrade_message: upgradeMessage,
    });

  } catch (e: any) {
    console.error("[stylize-unified] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
