// app/api/stylize-multimodel/route.ts
// Multi-model pipeline using SDXL, IP-Adapter SDXL, and Real-ESRGAN

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { processWithMultiModelPipeline, cropRatioToAspect } from "@/lib/multiModelPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Longer timeout for multi-model pipeline

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Upload function (same as before)
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

export async function POST(req: NextRequest) {
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
    const upscale = (form.get("upscale") || "true").toString() === "true";
    const upscaleFactor = parseInt((form.get("upscale_factor") || "2").toString()) as 2 | 4;

    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Ensure URL has proper protocol
    let user_url = user_url_raw;
    if (user_url_raw && !user_url_raw.startsWith('http://') && !user_url_raw.startsWith('https://')) {
      user_url = `https://${user_url_raw}`;
    }

    console.log(`[stylize-multimodel] Processing: ${styleLabel}, ${cropRatio}, upscale: ${upscale}`);

    // 1) Upload input image
    const inputUrl = await uploadToSupabasePublic(file);
    console.log(`[stylize-multimodel] Input uploaded: ${inputUrl}`);

    // 2) Process with multi-model pipeline
    const result = await processWithMultiModelPipeline(
      inputUrl,
      styleLabel,
      cropRatio,
      "dog", // You could make this dynamic
      upscale
    );

    console.log(`[stylize-multimodel] Pipeline complete: ${result.model}`);

    // 3) Store in database
    if (SUPABASE_URL && SERVICE_ROLE) {
      try {
        const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE);
        const insertData = {
          user_id: user_id || "00000000-0000-0000-0000-000000000000",
          output_url: result.imageUrl,
          high_res_url: result.imageUrl, // Multi-model pipeline already produces high-res
          input_url: inputUrl,
          preset_label: styleLabel,
          display_name: display_name || null,
          website: user_url || null,
          profile_image_url: null,
        };
        
        const { error } = await admin.from("generations").insert(insertData);
        if (error) {
          console.error("[stylize-multimodel] insert error:", error);
        } else {
          console.log("[stylize-multimodel] Successfully inserted into database ✅");
        }
      } catch (e) {
        console.error("[stylize-multimodel] insert exception:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      input_url: inputUrl,
      output_url: result.imageUrl,
      model: result.model,
      aspect: cropRatioToAspect(cropRatio),
      upscaled: upscale,
    });

  } catch (e: any) {
    console.error("[stylize-multimodel] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
