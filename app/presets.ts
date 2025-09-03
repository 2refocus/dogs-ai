export type Species = "dog" | "cat";

export const PRESETS: Record<Species, { label: string; value: string }[]> = {
  dog: [
    {
      label: "Studio portrait (seamless, 85mm)",
      value:
        "Studio portrait of the dog on a neutral seamless background, soft key light at 45°, 85mm look, crisp fur detail, subtle vignette, natural proportions"
    },
    {
      label: "Golden hour outdoors",
      value:
        "Outdoor golden hour portrait of the dog, backlit rim light, 35mm environmental framing, grassy field bokeh, natural colors, sharp fur detail"
    },
    {
      label: "Cozy indoor (warm window light)",
      value:
        "Cozy living room portrait of the dog, warm window light, shallow depth of field, textured blanket, soft highlights, natural anatomy"
    },
    {
      label: "Surf-skate poster",
      value:
        "Graphic surf-skate poster of the dog, bold halftones, dynamic angle, sunny boardwalk backdrop, high contrast, clean edges"
    },
    {
      label: "Galaxy explorer (cinematic)",
      value:
        "The dog as a galaxy explorer, dramatic rim light, nebula background, cinematic color grading, detailed suit, clean composition"
    }
  ],
  cat: [
    {
      label: "Minimalist studio (white seamless)",
      value:
        "Minimalist studio portrait of the cat on white seamless, softbox key light, 85mm look, fine whisker detail, clean background"
    },
    {
      label: "Vintage armchair (tungsten practicals)",
      value:
        "Portrait of the cat on a vintage armchair, warm tungsten practical lights, shallow depth of field, velvet textures, elegant mood"
    },
    {
      label: "Playful motion (window light)",
      value:
        "Playful portrait of the cat mid-leap, natural window light, implied motion blur in background only, crisp eyes and whiskers"
    },
    {
      label: "Galaxy explorer (cinematic)",
      value:
        "The cat as a galaxy explorer, cinematic rim light, nebula background, dramatic color contrast, sharp fur detail"
    }
  ]
};
