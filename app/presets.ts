export type Species = "dog" | "cat";
export type Preset = { label: string; value: string };

// ---- Identity / Camera / Negative (unchanged) ----
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

/** Style library — existing styles + 5 new packs */
const STYLES: { label: string; style: string }[] = [
  {
    label: "DEFAULT Portrait",
    style:
      "Dramatic fine-art portrait of a pet, against an ornate background in a cozy home, lit in rich cinematic lighting. Inspired by Annie Leibovitz, elegant, intricate details, painterly yet realistic, ultra high quality.",
  },
  // ---- New 5-style pack ----
  {
    label: "Modern Studio Portrait",
    style:
      "clean minimalist studio set, neutral gradient background, controlled soft key and subtle rim light, " +
      "shallow depth of field, timeless and refined",
  },
  {
    label: "Luxury Interior",
    style:
      "stylish upscale apartment interior, tasteful modern furniture, marble and wood accents, " +
      "subtle warm ambient lighting, sophisticated lifestyle mood",
  },
  {
    label: "Outdoor Premium Lifestyle",
    style:
      "editorial outdoor setting at golden hour, landscaped garden or chic rooftop terrace, " +
      "warm sunlight, cinematic bokeh, aspirational mood",
  },
  {
    label: "Fine Art Black & White",
    style:
      "dramatic monochrome portrait, high micro-contrast, deep shadows and luminous highlights, " +
      "textured backdrop, classic fine-art aesthetic",
  },
  {
    label: "Editorial Fashion Vibe",
    style:
      "fashion-inspired lighting setup (soft fill + dramatic rim), magazine-ready composition, " +
      "clean background, chic modern styling",
  },
  {
    label: "Classic Oil on Canvas",
    style:
      "classic oil painting on linen canvas, rich brushstrokes, warm amber palette, " +
      "Rembrandt lighting, subtle varnish sheen, gallery-grade finish",
  },
  {
    label: "Cozy Home Portrait",
    style:
      "soft window light, warm tungsten accents, knitted blanket texture, hygge aesthetic, " +
      "muted earth tones, gentle vignette",
  },
  {
    label: "Elegant Black & Gold",
    style:
      "dark charcoal backdrop, gold accent key light, editorial fine-art look, " +
      "sculpted shadows, luxurious yet restrained",
  },
  {
    label: "Watercolor Pastel",
    style:
      "delicate watercolor wash, pastel palette, soft bleeding edges, paper texture visible, " +
      "airy and light",
  },
  {
    label: "Matte Fine-Art Studio",
    style:
      "matte tonality, soft gradients, smooth background falloff, desaturated elegance, " +
      "gallery print vibes",
  },
  {
    label: "Vintage Film (Portra 400)",
    style:
      "Portra 400 film emulation, natural skin/fur tones, mild grain, soft contrast, " +
      "subtle halation on highlights",
  },
  {
    label: "Autumn Forest Glow",
    style:
      "golden hour backlight, autumn foliage bokeh, warm oranges and browns, " +
      "hazy atmosphere, cinematic glow",
  },
  {
    label: "Snowy Winter Portrait",
    style:
      "cool daylight, soft falling snow particles, pale blue-gray palette, " +
      "clean white backdrop with subtle depth",
  },
  {
    label: "Bohemian Floral",
    style:
      "soft floral backdrop, dried flowers & pampas accents, creamy tones, " +
      "romantic boutique studio look",
  },
  {
    label: "Modern Editorial",
    style:
      "neutral seamless background, directional softbox, crisp edge definition, " +
      "magazine editorial composition",
  },
  {
    label: "Renaissance Painting",
    style:
      "Renaissance oil technique, chiaroscuro lighting, deep muted colors, " +
      "canvas texture, museum-quality finish",
  },
  {
    label: "Cozy Cabin Wood",
    style:
      "warm lamplight, rustic wood textures, gentle smoke/tea steam ambiance, " +
      "amber color grade, snug atmosphere",
  },
  {
    label: "Fine Charcoal Sketch",
    style:
      "charcoal on textured paper, controlled hatching, realistic proportion, " +
      "tonal depth, smudge highlights",
  },

];

// ---------- Aspect Ratio suggestions per style ----------
export type AspectKey = "1:1" | "4:5" | "3:4" | "2:3" | "16:9";

export const STYLE_ASPECTS: Record<string, AspectKey> = {
  "DEFAULT Portrait": "4:5",
  "Classic Oil on Canvas": "4:5",
  "Cozy Home Portrait": "3:4",
  "Elegant Black & Gold": "4:5",
  "Watercolor Pastel": "4:5",
  "Matte Fine-Art Studio": "4:5",
  "Vintage Film (Portra 400)": "2:3",
  "Minimal Line Art": "1:1",
  "Autumn Forest Glow": "3:4",
  "Snowy Winter Portrait": "3:4",
  "Bohemian Floral": "4:5",
  "Modern Editorial": "4:5",
  "Renaissance Painting": "4:5",
  "Pop Art Halftone": "1:1",
  "Cozy Cabin Wood": "3:4",
  "Fine Charcoal Sketch": "3:4",

  // new
  "Modern Studio Portrait": "4:5",
  "Luxury Interior": "3:4",
  "Outdoor Premium Lifestyle": "3:4",
  "Fine Art Black & White": "4:5",
  "Editorial Fashion Vibe": "4:5",
};

// ---------- Prompt snippets for aspect handling ----------
type Mode = "generate" | "edit";

/** Natural-language aspect snippets that work well with Gemini/Nano Banana. */
function aspectSnippet(mode: Mode, ar: AspectKey, opts?: { extendBg?: boolean }) {
  const px = {
    "1:1": "1024×1024",
    "4:5": "1080×1350",
    "3:4": "1536×2048",
    "2:3": "2000×3000",
    "16:9": "1920×1080",
  }[ar];

  if (mode === "generate") {
    return `Compose in ${ar === "1:1" ? "a square frame" : "portrait orientation"}, aspect ratio ${ar} (${px}).`;
  }
  // edit mode (recreate on new canvas + optional background extension)
  const extend = opts?.extendBg ? " Extend the background naturally to fill the new frame." : "";
  const ori =
    ar === "1:1"
      ? "a NEW square canvas"
      : ar === "16:9"
      ? "a NEW wide cinematic canvas"
      : "a NEW portrait canvas";
  return `Recreate on ${ori}, aspect ratio ${ar} (${px}).${extend}`;
}

// ---------- Your original builders (unchanged) ----------
function buildPrompt(species: Species, style: string) {
  return (
    `${IDENTITY}. ` +
    `${CAMERA}. ` +
    `Style: ${style}. ` +
    `Avoid: ${NEGATIVE}.`
  );
}

function makeSet(species: Species): Preset[] {
  return STYLES.map(({ label, style }) => ({
    label,
    value: buildPrompt(species, style),
  }));
}

// Export in your existing shape (consumed by the UI)
export const PRESETS: Record<Species, Preset[]> = {
  dog: makeSet("dog"),
  cat: makeSet("cat"),
};

// ---------- Helper to attach the right aspect to any preset ----------
export function withAspect(
  presetValue: string,
  label: string,
  mode: Mode,
  opts?: { extendBg?: boolean; overrideAspect?: AspectKey }
) {
  const ar = opts?.overrideAspect ?? STYLE_ASPECTS[label] ?? "4:5";
  return `${presetValue} ${aspectSnippet(mode, ar, { extendBg: opts?.extendBg })}`.trim();
}

/** Example usage:
 * const p = PRESETS.dog.find(p => p.label === "Modern Editorial")!;
 * const finalGeneratePrompt = withAspect(p.value, p.label, "generate");
 * const finalEditPrompt = withAspect(p.value, p.label, "edit", { extendBg: true });
 */