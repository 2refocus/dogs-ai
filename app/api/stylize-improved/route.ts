// app/api/stylize-improved/route.ts
// Example of how to integrate your pipeline approach with the existing system

import { NextRequest } from "next/server";
import { buildPetPortraitPrompt, getSuggestedAspect } from "@/lib/promptBuilder";

// This is an example of how you could update your existing stylize API
// to use the improved prompt structure from your pipeline

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const styleLabel = (form.get("preset_label") || "Photorealistic").toString();
    const cropRatio = (form.get("crop_ratio") || "4_5").toString();
    const customPrompt = (form.get("prompt") || "").toString().trim();
    
    if (!file) {
      return Response.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Use the improved prompt builder
    const finalPrompt = buildPetPortraitPrompt({
      species: "dog", // You could make this dynamic
      styleLabel,
      cropRatio,
      customPrompt: customPrompt || undefined, // Use custom if provided
    });

    console.log(`[stylize-improved] Final prompt: ${finalPrompt}`);
    console.log(`[stylize-improved] Style: ${styleLabel}, Crop: ${cropRatio}`);
    
    // Here you would continue with your existing Replicate logic
    // but now using the improved prompt structure
    
    // For now, just return the prompt for testing
    return Response.json({
      ok: true,
      prompt: finalPrompt,
      style: styleLabel,
      cropRatio,
      suggestedAspect: getSuggestedAspect(styleLabel),
    });
    
  } catch (e: any) {
    console.error("[stylize-improved] error:", e?.message || e);
    return Response.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
