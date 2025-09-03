export type Species = "dog" | "cat";

type Preset = { label: string; value: string };

export const PRESETS: Record<Species, Preset[]> = {
  dog: [
    {
      label: "Elegant Studio Portrait",
      value:
        "Elegant studio portrait of a dog, softly lit with a warm key light, sharp eyes, shallow depth of field, neutral background, classic fine art photography style."
    },
    {
      label: "Cozy Home Vibes",
      value:
        "Cozy lifestyle portrait of a dog curled up on a blanket, natural window light, soft textures, warm tones, intimate and heartwarming composition."
    },
    {
      label: "Regal Oil Painting",
      value:
        "A regal fine-art oil painting of a dog, aristocratic 18th-century style, detailed brush strokes, warm golden tones, dramatic background."
    },
    {
      label: "Modern Minimalist",
      value:
        "Minimalist portrait of a dog, clean white background, high contrast lighting, elegant and simple composition, magazine aesthetic."
    }
  ],
  cat: [
    {
      label: "Elegant Studio Portrait",
      value:
        "Elegant studio portrait of a cat, softly lit with a warm key light, sharp eyes, shallow depth of field, neutral background, classic fine art photography style."
    },
    {
      label: "Cozy Home Vibes",
      value:
        "Cozy lifestyle portrait of a cat lounging on a soft blanket, natural window light, warm tones, gentle textures, peaceful and homely composition."
    },
    {
      label: "Regal Oil Painting",
      value:
        "A regal fine-art oil painting of a cat, aristocratic 18th-century style, rich brush strokes, deep golden tones, dramatic background."
    },
    {
      label: "Modern Minimalist",
      value:
        "Minimalist portrait of a cat, clean white background, high contrast lighting, elegant and simple composition, magazine aesthetic."
    }
  ]
};
