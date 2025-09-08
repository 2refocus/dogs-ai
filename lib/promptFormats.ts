// promptFormats.ts
/**
 * Nano-Banana Prompt Framework - Best Practices:
 * 
 * 1. Natürlichsprachlich belassen: Gemini/Nano Banana versteht „aspect ratio 4:5" als Teil der Szeneanweisung.
 * 2. Prompt-Reihenfolge: erst Szene/Stil, am Ende das Format-Snippet anhängen.
 * 3. Edit-Fälle: nutze extendBg: true, damit das Modell fehlende Ränder glaubhaft ergänzt, statt hart zu beschneiden.
 * 4. Strikte Konsistenz: nur bei Gesichtern/Produkten aktivieren – es reduziert kreative Variation.
 */

export type AspectKey =
  | "1_1" | "4_5" | "3_4" | "2_3"
  | "4_3" | "3_2"
  | "16_9" | "21_9"
  | "9_16";

export type Mode = "generate" | "edit";

type FormatPreset = {
  label: string;               // UI-Label
  ratioText: string;           // "4:5" usw.
  orientation: "portrait" | "landscape" | "square";
  prompts: {
    generate: string;          // kurzer Zusatz für Neugenerierung
    edit: (opts?: {extendBg?: boolean}) => string; // Zusatz für Edit
  }
};

// Kurze, klare, natürlichsprachliche Snippets (für Gemini/Nano Banana)
export const FORMAT_PRESETS: Record<AspectKey, FormatPreset> = {
  "1_1": {
    label: "1:1 (Square)",
    ratioText: "1:1",
    orientation: "square",
    prompts: {
      generate: "Generate in a square frame, aspect ratio 1:1.",
      edit: ({extendBg} = {}) =>
        `Recreate on a NEW canvas in square format, aspect ratio 1:1.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "4_5": {
    label: "4:5 (Portrait)",
    ratioText: "4:5",
    orientation: "portrait",
    prompts: {
      generate: "Use portrait orientation, aspect ratio 4:5.",
      edit: ({extendBg} = {}) =>
        `Recreate on a NEW canvas in portrait orientation, aspect ratio 4:5.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "3_4": {
    label: "3:4 (Portrait)",
    ratioText: "3:4",
    orientation: "portrait",
    prompts: {
      generate: "Use portrait orientation, aspect ratio 3:4.",
      edit: ({extendBg} = {}) =>
        `Recreate on a NEW canvas in portrait orientation, aspect ratio 3:4 (1536×2048).${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "2_3": {
    label: "2:3 (Portrait)",
    ratioText: "2:3",
    orientation: "portrait",
    prompts: {
      generate: "Use portrait orientation, aspect ratio 2:3.",
      edit: ({extendBg} = {}) =>
        `Recreate the uploaded image in portrait orientation, aspect ratio 2:3.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "4_3": {
    label: "4:3 (Landscape)",
    ratioText: "4:3",
    orientation: "landscape",
    prompts: {
      generate: "Use landscape orientation, aspect ratio 4:3.",
      edit: ({extendBg} = {}) =>
        `Recreate the uploaded image in landscape orientation, aspect ratio 4:3.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "3_2": {
    label: "3:2 (Landscape)",
    ratioText: "3:2",
    orientation: "landscape",
    prompts: {
      generate: "Use landscape orientation, aspect ratio 3:2.",
      edit: ({extendBg} = {}) =>
        `Recreate the uploaded image in landscape orientation, aspect ratio 3:2.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "16_9": {
    label: "16:9 (Wide)",
    ratioText: "16:9",
    orientation: "landscape",
    prompts: {
      generate: "Use a wide cinematic frame, aspect ratio 16:9.",
      edit: ({extendBg} = {}) =>
        `Recreate the uploaded image in a wide cinematic frame, aspect ratio 16:9.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "21_9": {
    label: "21:9 (Ultra-Wide)",
    ratioText: "21:9",
    orientation: "landscape",
    prompts: {
      generate: "Use an ultra-wide cinematic frame, aspect ratio 21:9.",
      edit: ({extendBg} = {}) =>
        `Recreate the uploaded image in an ultra-wide cinematic frame, aspect ratio 21:9.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  },
  "9_16": {
    label: "9:16 (Vertical)",
    ratioText: "9:16",
    orientation: "portrait",
    prompts: {
      generate: "Use a vertical mobile frame, aspect ratio 9:16.",
      edit: ({extendBg} = {}) =>
        `Recreate the uploaded image in a vertical mobile frame, aspect ratio 9:16.${extendBg ? " Extend the background naturally to fill the frame." : ""}`
    }
  }
};

// Helper: Base-Prompt + Format-Snippet zusammenbauen
// Best Practice: Prompt-Reihenfolge - erst Szene/Stil, am Ende das Format-Snippet
export function composePrompt(
  basePrompt: string,
  mode: Mode,
  aspect: AspectKey,
  options?: { extendBg?: boolean; strictConsistency?: boolean }
) {
  const preset = FORMAT_PRESETS[aspect];
  
  // Best Practice: Edit-Fälle mit extendBg für natürliche Hintergrund-Erweiterung
  const snippet =
    mode === "generate"
      ? preset.prompts.generate
      : preset.prompts.edit({ extendBg: options?.extendBg ?? true });

  // Best Practice: Strikte Konsistenz nur bei Gesichtern/Produkten aktivieren
  const consistency = options?.strictConsistency
    ? " Maintain exact likeness, expression, clothing, and color tones."
    : "";

  // Best Practice: Format-Snippet am Ende platzieren → gute Einordnung durch das Modell
  // Natürlichsprachlich belassen: Gemini/Nano Banana versteht "aspect ratio 4:5" als Teil der Szeneanweisung
  return `${basePrompt.trim()} ${snippet}${consistency}`.trim();
}

// Social Media Format Mappings
export const SOCIAL_DEFAULTS: Record<string, AspectKey> = {
  instagram_post: "4_5",   // besseres Feed-Real-Estate
  instagram_square: "1_1",
  instagram_story: "9_16",
  instagram_reel: "9_16",
  tiktok_video: "9_16",
  youtube_thumbnail: "16_9",
  linkedin_post: "1_1",
  facebook_event_cover: "16_9",
};
