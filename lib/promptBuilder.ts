// lib/promptBuilder.ts
// Improved prompt building using your pipeline architecture

export type AspectKey = "1:1" | "3:4" | "4:5" | "2:3" | "16:9";
export type Species = "dog" | "cat";

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

// Core prompt components (from your pipeline)
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
  "no distortion, no over-saturation, no human, no person, no people";

// Style presets (matching your existing presets)
const STYLE_PACKS: Record<string, string> = {
  "Watercolor": "watercolor painting style, soft brushstrokes, artistic watercolor technique, flowing colors",
  "Oil Painting": "oil painting style, rich textures, classical painting technique, bold brushwork",
  "Pencil Sketch": "pencil sketch style, detailed line work, artistic drawing, monochrome shading",
  "Digital Art": "digital art style, clean modern illustration, vibrant colors, contemporary aesthetic",
  "Photorealistic": "photorealistic style, high detail, professional photography, studio quality",
  "Anime": "anime art style, Japanese animation aesthetic, vibrant colors, stylized features",
  "Cartoon": "cartoon illustration style, playful and fun, bright colors, simplified features",
  "Vintage": "vintage photography style, film grain, warm tones, nostalgic aesthetic",
  "Black & White": "black and white photography, high contrast, dramatic lighting, timeless",
  "Pop Art": "pop art style, bold colors, graphic design elements, Andy Warhol inspired",
};

// Suggested aspect per style
const STYLE_ASPECT: Record<string, AspectKey> = {
  "Watercolor": "4:5",
  "Oil Painting": "3:4", 
  "Pencil Sketch": "4:5",
  "Digital Art": "4:5",
  "Photorealistic": "3:4",
  "Anime": "4:5",
  "Cartoon": "4:5",
  "Vintage": "3:4",
  "Black & White": "4:5",
  "Pop Art": "1:1",
};

// Aspect snippets (from your pipeline)
export function aspectSnippet(aspect: AspectKey): string {
  const aspectMap = {
    "1:1": "Compose in a square frame, aspect ratio 1:1 (1024×1024).",
    "3:4": "Compose in portrait orientation, aspect ratio 3:4 (1536×2048).",
    "4:5": "Compose in portrait orientation, aspect ratio 4:5 (1080×1350).",
    "2:3": "Compose in portrait orientation, aspect ratio 2:3 (2000×3000).",
    "16:9": "Compose in a wide cinematic frame, aspect ratio 16:9 (1920×1080).",
  };
  return aspectMap[aspect];
}

// Main prompt builder
export function buildPetPortraitPrompt(opts: {
  species?: Species;
  styleLabel: string;
  cropRatio?: string;
  customPrompt?: string;
}): string {
  const { species = "dog", styleLabel, cropRatio = "4_5", customPrompt } = opts;
  
  // Use custom prompt if provided, otherwise build from components
  if (customPrompt) {
    return customPrompt.trim();
  }
  
  const aspect = cropRatioToAspect(cropRatio);
  const style = STYLE_PACKS[styleLabel] || STYLE_PACKS["Photorealistic"];
  const aspectGuidance = aspectSnippet(aspect);
  
  const basePrompt = `${IDENTITY}. ${CAMERA}. Style: ${style}. Avoid: ${NEGATIVE}. ${aspectGuidance}`.trim();
  
  return basePrompt;
}

// Get suggested aspect for a style
export function getSuggestedAspect(styleLabel: string): AspectKey {
  return STYLE_ASPECT[styleLabel] || "4:5";
}

// Get all available styles
export function getAvailableStyles(): string[] {
  return Object.keys(STYLE_PACKS);
}

// Validate style
export function isValidStyle(styleLabel: string): boolean {
  return styleLabel in STYLE_PACKS;
}
