// lib/multiModelPipeline.ts
// Multi-model pipeline using SDXL, IP-Adapter SDXL, and Real-ESRGAN

export type AspectKey = "1:1" | "3:4" | "4:5" | "2:3" | "16:9";
export type Species = "dog" | "cat";
export type PipelineMode = "generate" | "edit" | "upscale";

// Model configurations for Replicate
const REPLICATE_MODELS = {
  SDXL: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
  IP_ADAPTER_SDXL: "lucataco/ip-adapter-sdxl:4a3b5b1b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b", // TODO: Get real model ID
  REAL_ESRGAN: "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
} as const;

// Aspect ratio to pixel dimensions
const ASPECT_TO_PIXELS: Record<AspectKey, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 768, height: 1024 },
  "4:5": { width: 832, height: 1040 },
  "2:3": { width: 768, height: 1152 },
  "16:9": { width: 1024, height: 576 },
};

// Convert crop ratio to aspect
export function cropRatioToAspect(cropRatio: string): AspectKey {
  switch (cropRatio) {
    case "1_1": return "1:1";
    case "3_4": return "3:4";
    case "4_5": return "4:5";
    case "2_3": return "2:3";
    case "16_9": return "16:9";
    default: return "4:5";
  }
}

// Style presets optimized for SDXL
const STYLE_PACKS: Record<string, string> = {
  "Watercolor": "watercolor painting, soft brushstrokes, artistic watercolor technique, flowing colors, artistic texture",
  "Oil Painting": "oil painting, rich textures, classical painting technique, bold brushwork, artistic medium, renaissance style",
  "Pencil Sketch": "pencil sketch, detailed line work, artistic drawing, monochrome shading, sketch aesthetic, graphite drawing",
  "Digital Art": "digital art, clean modern illustration, vibrant colors, contemporary aesthetic, digital painting, concept art",
  "Photorealistic": "photorealistic, high detail, professional photography, studio quality, realistic rendering, sharp focus",
  "Anime": "anime art style, Japanese animation aesthetic, vibrant colors, stylized features, manga-inspired, cel shading",
  "Cartoon": "cartoon illustration, playful and fun, bright colors, simplified features, animated look, Disney style",
  "Vintage": "vintage photography, film grain, warm tones, nostalgic aesthetic, retro look, 1950s style",
  "Black & White": "black and white photography, high contrast, dramatic lighting, timeless, monochrome, film noir",
  "Pop Art": "pop art style, bold colors, graphic design elements, Andy Warhol inspired, vibrant contrast, comic book style",
  "Impressionist": "impressionist painting, loose brushstrokes, light and color focus, artistic movement, Monet style",
  "Surreal": "surreal art, dreamlike quality, imaginative elements, artistic fantasy, Dali inspired",
};

// Core prompt components
const IDENTITY = 
  "transform this into a single pet head-and-shoulders portrait, rule of thirds composition, looking at camera; " +
  "convert any human or other subject into a realistic pet (dog or cat), preserve the original pose and composition; " +
  "realistic breed, unique markings, fur texture and eye color; " +
  "respect the original pose and proportions; no changes to anatomy; " +
  "PRESERVE the original animal type - if it's a dog, keep it as a dog; if it's a cat, keep it as a cat; only convert humans to pets";

const CAMERA = 
  "fine-art studio photograph, 85mm lens look, shallow depth of field (f/1.8), " +
  "soft key + subtle rim light, gentle bokeh, high detail, crisp facial features";

const NEGATIVE = 
  "no text, no watermark, no frame, no hands, no extra limbs, no second animal, " +
  "no distortion, no over-saturation, no human, no person, no people, blurry, low quality";

// Build prompts for different models
export function buildSDXLPrompt(opts: {
  species: Species;
  styleLabel: string;
  aspect: AspectKey;
}): string {
  const { species, styleLabel, aspect } = opts;
  const style = STYLE_PACKS[styleLabel] || STYLE_PACKS["Photorealistic"];
  
  return `${IDENTITY}. ${CAMERA}. Style: ${style}. Avoid: ${NEGATIVE}.`.trim();
}

export function buildIPAdapterPrompt(opts: {
  species: Species;
  styleLabel: string;
  aspect: AspectKey;
}): string {
  const { species, styleLabel, aspect } = opts;
  const style = STYLE_PACKS[styleLabel] || STYLE_PACKS["Photorealistic"];
  
  // IP-Adapter specific prompt (more focused on style transfer)
  return `Transform the image into ${style}. ${CAMERA}. Avoid: ${NEGATIVE}.`.trim();
}

// Replicate API helpers
async function callReplicateModel(model: string, input: any): Promise<string> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: model,
      input,
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.status}`);
  }

  const prediction = await response.json();
  return prediction.id;
}

async function pollPrediction(predictionId: string): Promise<string> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  
  while (true) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
      },
    });

    const prediction = await response.json();
    
    if (prediction.status === "succeeded") {
      return prediction.output[0];
    } else if (prediction.status === "failed") {
      throw new Error(`Prediction failed: ${prediction.error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Pipeline functions
export async function generateWithSDXL(opts: {
  prompt: string;
  aspect: AspectKey;
  width?: number;
  height?: number;
}): Promise<string> {
  const { prompt, aspect, width, height } = opts;
  const dimensions = width && height ? { width, height } : ASPECT_TO_PIXELS[aspect];
  
  const input = {
    prompt,
    width: dimensions.width,
    height: dimensions.height,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    negative_prompt: NEGATIVE,
  };

  const predictionId = await callReplicateModel(REPLICATE_MODELS.SDXL, input);
  return await pollPrediction(predictionId);
}

export async function editWithIPAdapter(opts: {
  imageUrl: string;
  prompt: string;
  aspect: AspectKey;
  width?: number;
  height?: number;
}): Promise<string> {
  const { imageUrl, prompt, aspect, width, height } = opts;
  const dimensions = width && height ? { width, height } : ASPECT_TO_PIXELS[aspect];
  
  const input = {
    image: imageUrl,
    prompt,
    width: dimensions.width,
    height: dimensions.height,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    negative_prompt: NEGATIVE,
  };

  const predictionId = await callReplicateModel(REPLICATE_MODELS.IP_ADAPTER_SDXL, input);
  return await pollPrediction(predictionId);
}

export async function upscaleWithRealESRGAN(opts: {
  imageUrl: string;
  scale?: 2 | 4;
}): Promise<string> {
  const { imageUrl, scale = 2 } = opts;
  
  const input = {
    image: imageUrl,
    scale,
    face_enhance: true,
  };

  const predictionId = await callReplicateModel(REPLICATE_MODELS.REAL_ESRGAN, input);
  return await pollPrediction(predictionId);
}

// Main pipeline orchestrator
export async function processPetPortrait(opts: {
  mode: "generate" | "edit";
  inputImageUrl?: string;
  species: Species;
  styleLabel: string;
  aspect: AspectKey;
  upscale?: boolean;
  upscaleFactor?: 2 | 4;
}): Promise<{
  imageUrl: string;
  intermediateUrl?: string;
  model: string;
  aspect: AspectKey;
}> {
  const { mode, inputImageUrl, species, styleLabel, aspect, upscale = true, upscaleFactor = 2 } = opts;
  
  let resultUrl: string;
  let model: string;
  
  if (mode === "generate") {
    // Pure text-to-image with SDXL
    const prompt = buildSDXLPrompt({ species, styleLabel, aspect });
    resultUrl = await generateWithSDXL({ prompt, aspect });
    model = "SDXL";
  } else {
    // Image-guided edit with IP-Adapter SDXL
    if (!inputImageUrl) {
      throw new Error("Input image required for edit mode");
    }
    
    const prompt = buildIPAdapterPrompt({ species, styleLabel, aspect });
    resultUrl = await editWithIPAdapter({ 
      imageUrl: inputImageUrl, 
      prompt, 
      aspect 
    });
    model = "IP-Adapter-SDXL";
  }
  
  // Upscale if requested
  if (upscale) {
    const upscaledUrl = await upscaleWithRealESRGAN({ 
      imageUrl: resultUrl, 
      scale: upscaleFactor 
    });
    
    return {
      imageUrl: upscaledUrl,
      intermediateUrl: resultUrl,
      model: `${model} + Real-ESRGAN ${upscaleFactor}x`,
      aspect,
    };
  }
  
  return {
    imageUrl: resultUrl,
    model,
    aspect,
  };
}

// Integration helper for existing API
export async function processWithMultiModelPipeline(
  inputImageUrl: string,
  styleLabel: string,
  cropRatio: string,
  species: Species = "dog",
  upscale: boolean = true
): Promise<{ imageUrl: string; model: string }> {
  const aspect = cropRatioToAspect(cropRatio);
  
  const result = await processPetPortrait({
    mode: "edit", // Always use edit mode for existing images
    inputImageUrl,
    species,
    styleLabel,
    aspect,
    upscale,
  });
  
  return {
    imageUrl: result.imageUrl,
    model: result.model,
  };
}
