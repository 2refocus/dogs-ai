export type Species = "dog" | "cat";
export type Preset = { label: string; value: string };

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

/** Style library — only these words change between presets. */
const STYLES: { label: string; style: string }[] = [
  {
    label: "DEFAULT Portrait",
    style:
      "Dramatic fine-art portrait of a pet, against an ornate background in a cozy home, lit in rich cinematic lighting. Inspired by Annie Leibovitz, elegant, intricate details, painterly yet realistic, ultra high quality.",
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
    label: "Minimal Line Art",
    style:
      "single-weight line art, clean outlines, sparse shading, ivory paper background, " +
      "contemporary minimalism",
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
    label: "Pop Art Halftone",
    style:
      "bold pop-art poster, halftone shading, limited high-contrast palette, " +
      "clean graphic feel",
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

function buildPrompt(species: Species, style: string) {
  // Keep the template order stable for consistency
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
