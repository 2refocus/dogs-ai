// lib/replicatePipeline.ts
// Your pipeline architecture adapted for Replicate models

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

// Convert AspectKey back to Replicate format
export function aspectToCropRatio(aspect: AspectKey): string {
  switch (aspect) {
    case "1:1": return "1_1";
    case "3:4": return "3_4";
    case "4:5": return "4_5";
    case "2:3": return "2_3";
    case "16:9": return "16_9";
    default: return "4_5";
  }
}

// Core prompt components (adapted for Replicate models)
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

// Style presets optimized for Replicate models (matching app/presets.ts)
const STYLE_PACKS: Record<string, string> = {
  "DEFAULT Portrait": "Dramatic fine-art portrait of a pet, against an ornate background in a cozy home, lit in rich cinematic lighting. Inspired by Annie Leibovitz, elegant, intricate details, painterly yet realistic, ultra high quality.",
  "Classic Oil on Canvas": "classic oil painting on linen canvas, rich brushstrokes, warm amber palette, Rembrandt lighting, subtle varnish sheen, gallery-grade finish",
  "Cozy Home Portrait": "soft window light, warm tungsten accents, knitted blanket texture, hygge aesthetic, muted earth tones, gentle vignette",
  "Elegant Black & Gold": "dark charcoal backdrop, gold accent key light, editorial fine-art look, sculpted shadows, luxurious yet restrained",
  "Watercolor Pastel": "delicate watercolor wash, pastel palette, soft bleeding edges, paper texture visible, airy and light",
  "Matte Fine-Art Studio": "matte tonality, soft gradients, smooth background falloff, desaturated elegance, gallery print vibes",
  "Vintage Film (Portra 400)": "Portra 400 film emulation, natural skin/fur tones, mild grain, soft contrast, subtle halation on highlights",
  "Minimal Line Art": "single-weight line art, clean outlines, sparse shading, ivory paper background, contemporary minimalism",
  "Autumn Forest Glow": "golden hour backlight, autumn foliage bokeh, warm oranges and browns, hazy atmosphere, cinematic glow",
  "Snowy Winter Portrait": "cool daylight, soft falling snow particles, pale blue-gray palette, clean white backdrop with subtle depth",
  "Bohemian Floral": "soft floral backdrop, dried flowers & pampas accents, creamy tones, romantic boutique studio look",
  "Modern Editorial": "neutral seamless background, directional softbox, crisp edge definition, magazine editorial composition",
  "Renaissance Painting": "Renaissance oil technique, chiaroscuro lighting, deep muted colors, canvas texture, museum-quality finish",
  "Pop Art Halftone": "bold pop-art poster, halftone shading, limited high-contrast palette, clean graphic feel",
  "Cozy Cabin Wood": "warm lamplight, rustic wood textures, gentle smoke/tea steam ambiance, amber color grade, snug atmosphere",
  "Fine Charcoal Sketch": "charcoal on textured paper, controlled hatching, realistic proportion, tonal depth, smudge highlights",
  "Modern Studio Portrait": "clean minimalist studio set, neutral gradient background, controlled soft key and subtle rim light, shallow depth of field, timeless and refined",
  "Luxury Interior": "stylish upscale apartment interior, tasteful modern furniture, marble and wood accents, subtle warm ambient lighting, sophisticated lifestyle mood",
  "Outdoor Premium Lifestyle": "editorial outdoor setting at golden hour, landscaped garden or chic rooftop terrace, warm sunlight, cinematic bokeh, aspirational mood",
  "Fine Art Black & White": "dramatic monochrome portrait, high micro-contrast, deep shadows and luminous highlights, textured backdrop, classic fine-art aesthetic",
  "Editorial Fashion Vibe": "fashion-inspired lighting setup (soft fill + dramatic rim), magazine-ready composition, clean background, chic modern styling",
  // Legacy styles for backward compatibility
  "Watercolor": "watercolor painting style, soft brushstrokes, artistic watercolor technique, flowing colors, artistic texture",
  "Oil Painting": "oil painting style, rich textures, classical painting technique, bold brushwork, artistic medium",
  "Pencil Sketch": "pencil sketch style, detailed line work, artistic drawing, monochrome shading, sketch aesthetic",
  "Digital Art": "digital art style, clean modern illustration, vibrant colors, contemporary aesthetic, digital painting",
  "Photorealistic": "photorealistic style, high detail, professional photography, studio quality, realistic rendering",
  "Anime": "anime art style, Japanese animation aesthetic, vibrant colors, stylized features, manga-inspired",
  "Cartoon": "cartoon illustration style, playful and fun, bright colors, simplified features, animated look",
  "Vintage": "vintage photography style, film grain, warm tones, nostalgic aesthetic, retro look",
  "Black & White": "black and white photography, high contrast, dramatic lighting, timeless, monochrome",
  "Pop Art": "pop art style, bold colors, graphic design elements, Andy Warhol inspired, vibrant contrast",
  "Impressionist": "impressionist painting style, loose brushstrokes, light and color focus, artistic movement",
  "Surreal": "surreal art style, dreamlike quality, imaginative elements, artistic fantasy",
};

// Suggested aspect per style (matching app/presets.ts)
const STYLE_ASPECT: Record<string, AspectKey> = {
  "DEFAULT Portrait": "4:5",
  "Classic Oil on Canvas": "3:4",
  "Cozy Home Portrait": "4:5",
  "Elegant Black & Gold": "3:4",
  "Watercolor Pastel": "4:5",
  "Matte Fine-Art Studio": "4:5",
  "Vintage Film (Portra 400)": "3:4",
  "Minimal Line Art": "4:5",
  "Autumn Forest Glow": "4:5",
  "Snowy Winter Portrait": "4:5",
  "Bohemian Floral": "4:5",
  "Modern Editorial": "3:4",
  "Renaissance Painting": "3:4",
  "Pop Art Halftone": "1:1",
  "Cozy Cabin Wood": "4:5",
  "Fine Charcoal Sketch": "4:5",
  "Modern Studio Portrait": "4:5",
  "Luxury Interior": "3:4",
  "Outdoor Premium Lifestyle": "3:4",
  "Fine Art Black & White": "4:5",
  "Editorial Fashion Vibe": "4:5",
  // Legacy styles for backward compatibility
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
  "Impressionist": "3:4",
  "Surreal": "4:5",
};

// Aspect guidance for Replicate models (more specific than generic)
export function aspectSnippet(aspect: AspectKey): string {
  const aspectMap = {
    "1:1": "Compose in a square frame, centered composition, balanced elements on all sides.",
    "3:4": "Compose in portrait orientation, vertical framing, focus on head and shoulders with some background.",
    "4:5": "Compose in portrait orientation, Instagram-style framing, tight head and shoulders composition.",
    "2:3": "Compose in tall portrait orientation, full head and shoulders with more background context.",
    "16:9": "Compose in wide cinematic frame, landscape orientation, include environmental context.",
  };
  return aspectMap[aspect];
}

// Main prompt builder for Replicate
export function buildReplicatePrompt(opts: {
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

// Replicate-specific parameters builder
export function buildReplicateParams(opts: {
  imageUrl: string;
  prompt: string;
  cropRatio?: string;
  styleLabel?: string;
}): any {
  const { imageUrl, prompt, cropRatio = "4_5", styleLabel } = opts;
  
  const params: any = {
    image_input: [imageUrl], // Replicate expects array
    prompt,
  };
  
  // Add crop ratio if not default
  if (cropRatio && cropRatio !== "1_1") {
    const replicateCropRatio = cropRatio.replace("_", ":");
    params.crop_ratio = replicateCropRatio;
  }
  
  // Add style-specific parameters if needed
  if (styleLabel) {
    // You could add model-specific parameters here
    // For example, some models support style strength, guidance scale, etc.
    // params.style_strength = 0.8;
    // params.guidance_scale = 7.5;
  }
  
  return params;
}

// Model-specific optimizations
export function optimizePromptForReplicate(prompt: string, model: string = "google/nano-banana"): string {
  // Nano-banana specific optimizations
  if (model.includes("nano-banana")) {
    // Nano-banana works well with shorter, more direct prompts
    return prompt
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .replace(/\.\s*\./g, '.') // Remove double periods
      .trim();
  }
  
  // Add other model-specific optimizations here
  return prompt;
}

// Quality settings for different use cases
export const QUALITY_PRESETS = {
  "fast": {
    guidance_scale: 7.0,
    num_inference_steps: 20,
  },
  "balanced": {
    guidance_scale: 7.5,
    num_inference_steps: 30,
  },
  "high": {
    guidance_scale: 8.0,
    num_inference_steps: 50,
  },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;
