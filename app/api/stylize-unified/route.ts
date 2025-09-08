// app/api/stylize-unified/route.ts
// Unified API that can use different pipeline modes

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { processWithMultiModelPipeline } from "@/lib/multiModelPipeline";
import { buildReplicatePrompt, optimizePromptForReplicate } from "@/lib/replicatePipeline";
import { getRecommendedPipeline, PipelineMode } from "@/lib/pipelineConfig";
import { selectPipelineForRequest, getUserTier } from "@/lib/pipelineStrategy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for multi-model pipeline

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "google/nano-banana";

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
  
  // Use existing Replicate API call
  const body: any = {
    input: {
      image_input: [inputUrl],
      prompt: optimizedPrompt,
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
  
  // Poll for completion
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    result = await pollRes.json();
  }
  
  if (result.status === "failed") {
    throw new Error(`Generation failed: ${result.error}`);
  }
  
  return {
    imageUrl: result.output[0],
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
      result = await processWithMultiModelPipeline(inputUrl, styleLabel, cropRatio, "dog", true);
    } else {
      // Hybrid: Simple + upscaling
      const simpleResult = await processSimplePipeline(inputUrl, styleLabel, cropRatio);
      // TODO: Add upscaling step here
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
          high_res_url: result.imageUrl,
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
