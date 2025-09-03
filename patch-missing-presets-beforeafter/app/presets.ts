export type Species = "dog" | "cat";

type Preset = { label: string; value: string };

export const PRESETS: Record<Species, Preset[]> = {
  dog: [
    { label: "Classic Oil Painting", value: "A regal oil painting portrait of a dog, 3/4 view, Rembrandt lighting, rich texture, dramatic background, museum-grade realism." },
    { label: "Cartoon Sticker", value: "Cute cartoon sticker style, bold outlines, flat colors, glossy highlights, white stroke, centered composition." },
    { label: "Cyberpunk Neon", value: "Cyberpunk style, neon rim light, holographic city bokeh, chromatic aberration, futuristic collar, vivid contrasts." },
    { label: "Watercolor", value: "Soft watercolor portrait, wet-on-wet blending, paper texture, pastel palette, gentle brush strokes, high-contrast eyes." }
  ],
  cat: [
    { label: "Classic Oil Painting", value: "A regal oil painting portrait of a cat, 3/4 view, Rembrandt lighting, rich texture, dramatic background, museum-grade realism." },
    { label: "Cartoon Sticker", value: "Adorable cartoon sticker style, bold outlines, flat colors, glossy highlights, white stroke, centered composition." },
    { label: "Galaxy Magic", value: "Cosmic fantasy, sparkling stars, nebula colors, glimmering particles, magical aura around the cat." },
    { label: "Watercolor", value: "Soft watercolor portrait, wet-on-wet blending, paper texture, pastel palette, gentle brush strokes, high-contrast eyes." }
  ]
};
