// lib/googlePipeline.ts
// Integration of your pipeline with the existing Next.js app

import { GoogleGenerativeAI } from "@google/generative-ai";

export type AspectKey = "1:1" | "3:4" | "4:5" | "2:3" | "16:9";
export type Species = "dog" | "cat";

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY!);

// Model names
const MODEL_NANOBANANA = "gemini-2.0-flash-exp";
const MODEL_IMAGEN_GENERATE = "imagen-3.0-generate-001";

// Aspect to pixels mapping
const ASPECT_TO_PIXELS: Record<AspectKey, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 1536, height: 2048 },
  "4:5": { width: 1080, height: 1350 },
  "2:3": { width: 2000, height: 3000 },
  "16:9": { width: 1920, height: 1080 },
};

// Style presets (matching your existing presets)
const STYLE_PACKS: Record<string, string> = {
  "Watercolor": "watercolor painting style, soft brushstrokes, artistic watercolor technique",
  "Oil Painting": "oil painting style, rich textures, classical painting technique",
  "Pencil Sketch": "pencil sketch style, detailed line work, artistic drawing",
  "Digital Art": "digital art style, clean modern illustration, vibrant colors",
  "Photorealistic": "photorealistic style, high detail, professional photography",
};

const STYLE_ASPECT: Record<string, AspectKey> = {
  "Watercolor": "4:5",
  "Oil Painting": "3:4", 
  "Pencil Sketch": "4:5",
  "Digital Art": "4:5",
  "Photorealistic": "3:4",
};

// Core prompt building (adapted from your pipeline)
const IDENTITY = 
  "transform this into a single pet head-and-shoulders portrait, rule of thirds composition, looking at camera; " +
  "convert any human or other subject into a realistic pet (dog or cat), preserve the original pose and composition; " +
  "realistic breed, unique markings, fur texture and eye color; " +
  "respect the original pose and proportions; no changes to anatomy";

const CAMERA = 
  "fine-art studio photograph, 85mm lens look, shallow depth of field (f/1.8), " +
  "soft key + subtle rim light, gentle bokeh, high detail, crisp facial features";

const NEGATIVE = 
  "no text, no watermark, no frame, no hands, no extra limbs, no second animal, " +
  "no distortion, no over-saturation, no human, no person, no people";

export function buildBasePrompt(species: Species, styleLabel: string): string {
  const style = STYLE_PACKS[styleLabel] ?? STYLE_PACKS["Photorealistic"];
  return `${IDENTITY}. ${CAMERA}. Style: ${style}. Avoid: ${NEGATIVE}.`.trim();
}

export function aspectSnippet(mode: "generate" | "edit", aspect: AspectKey): string {
  const px = ASPECT_TO_PIXELS[aspect];
  if (mode === "generate") {
    return `Compose in ${aspect === "1:1" ? "a square frame" : aspect === "16:9" ? "a wide cinematic frame" : "portrait orientation"}, aspect ratio ${aspect} (${px.width}×${px.height}).`;
  }
  return `Recreate on ${aspect === "1:1" ? "a NEW square canvas" : aspect === "16:9" ? "a NEW wide cinematic canvas" : "a NEW portrait canvas"}, aspect ratio ${aspect} (${px.width}×${px.height}).`;
}

// Convert your crop ratio format to AspectKey
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

// Main generation function (replaces Replicate)
export async function generatePetPortrait(opts: {
  species: Species;
  styleLabel: string;
  aspect?: AspectKey;
  inputImage?: Uint8Array; // For edit mode
}): Promise<{ imageUrl: string; model: string }> {
  const aspect = opts.aspect ?? STYLE_ASPECT[opts.styleLabel] ?? "4:5";
  const base = buildBasePrompt(opts.species, styleLabel);
  
  if (opts.inputImage) {
    // Edit mode with Gemini
    const editPrompt = `${base} ${aspectSnippet("edit", aspect)}`.trim();
    
    const model = genAI.getGenerativeModel({ model: MODEL_NANOBANANA });
    const imagePart = {
      inlineData: {
        data: Buffer.from(opts.inputImage).toString('base64'),
        mimeType: 'image/jpeg'
      }
    };
    
    const result = await model.generateContent([editPrompt, imagePart]);
    const response = await result.response;
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!imageData) {
      throw new Error("No image generated");
    }
    
    // Convert base64 to URL (you'd upload to Supabase storage here)
    const imageBuffer = Buffer.from(imageData, 'base64');
    // TODO: Upload to Supabase storage and return URL
    const imageUrl = `data:image/jpeg;base64,${imageData}`;
    
    return { imageUrl, model: MODEL_NANOBANANA };
  } else {
    // Generate mode with Imagen (if available in your region)
    const generatePrompt = `${base} ${aspectSnippet("generate", aspect)}`.trim();
    
    // TODO: Implement Imagen generation
    // This would require Vertex AI SDK or Google AI SDK with Imagen support
    throw new Error("Imagen generation not implemented yet - use edit mode");
  }
}

// Integration with existing API
export async function processWithGooglePipeline(
  inputImage: Uint8Array,
  styleLabel: string,
  cropRatio: string,
  species: Species = "dog"
): Promise<{ imageUrl: string; model: string }> {
  const aspect = cropRatioToAspect(cropRatio);
  
  return generatePetPortrait({
    species,
    styleLabel,
    aspect,
    inputImage, // Always use edit mode for now
  });
}
