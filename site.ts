export const site = {
  name: "Pet Portrait Studio",
  tagline: "Elegant & cozy styles for pets",
  description: "Stylized dog & cat portraits powered by Google Nano Banana on Replicate.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com",
  nav: {
    showSettingsQuick: true,
  },
  meta: {
    themeColor: "#0f1115",
    colorScheme: "dark light",
  },
} as const;
export type Site = typeof site;
