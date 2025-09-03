export type Species = "dog" | "cat";
type Preset = { label: string; value: string };

export const PRESETS: Record<Species, Preset[]> = {
  dog: [
    { label: "Elegant Studio Portrait", value: "Elegant studio portrait of a dog, softly lit with a warm key light, sharp eyes, shallow depth of field, neutral background, classic fine art photography style." },
    { label: "Cozy Home Vibes", value: "Cozy lifestyle portrait of a dog curled up on a blanket, natural window light, soft textures, warm tones, intimate and heartwarming composition." },
    { label: "Regal Oil Painting", value: "A regal fine-art oil painting of a dog, aristocratic 18th-century style, detailed brush strokes, warm golden tones, dramatic background." },
    { label: "Modern Minimalist", value: "Minimalist portrait of a dog, clean white background, high contrast lighting, elegant and simple composition, magazine aesthetic." },
    { label: "Classic Oil Painting", value: "A classic oil painting portrait of a dog, 3/4 view, Rembrandt lighting, rich brush texture, dramatic dark background, museum-grade realism, fine details around the eyes and fur." },
    { label: "Watercolor", value: "Soft watercolor dog portrait, wet-on-wet blending, subtle paper texture, pastel palette, gentle brush strokes, crisp eyes for focal contrast." },
    { label: "Cartoon Sticker", value: "Cute cartoon sticker style portrait of a dog, bold outlines, flat colors, glossy highlights, soft drop shadow, white sticker stroke, centered and clean composition." }
  ],
  cat: [
    { label: "Elegant Studio Portrait", value: "Elegant studio portrait of a cat, softly lit with a warm key light, sharp eyes, shallow depth of field, neutral background, classic fine art photography style." },
    { label: "Cozy Home Vibes", value: "Cozy lifestyle portrait of a cat lounging on a soft blanket, natural window light, warm tones, gentle textures, peaceful and homely composition." },
    { label: "Regal Oil Painting", value: "A regal fine-art oil painting of a cat, aristocratic 18th-century style, rich brush strokes, deep golden tones, dramatic background." },
    { label: "Modern Minimalist", value: "Minimalist portrait of a cat, clean white background, high contrast lighting, elegant and simple composition, magazine aesthetic." },
    { label: "Classic Oil Painting", value: "A classic oil painting portrait of a cat, 3/4 view, Rembrandt lighting, rich brush texture, dramatic dark background, museum-grade realism, fine details around the eyes and whiskers." },
    { label: "Watercolor", value: "Soft watercolor cat portrait, wet-on-wet blending, subtle paper texture, pastel palette, gentle brush strokes, crisp eyes for focal contrast." },
    { label: "Cartoon Sticker", value: "Adorable cartoon sticker style portrait of a cat, bold outlines, flat colors, glossy highlights, soft drop shadow, white sticker stroke, centered and clean composition." }
  ]
};
