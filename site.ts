export const site = {
  name: "Pet Portrait Studio *",
  tagline: "Elegant & cozy portraits of your pets",
  description: "Stylized dog & cat portraits",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://dogs-ai-eight.vercel.app",
  nav: {
    showSettingsQuick: true,
  },
  meta: {
    themeColor: "#0f1115",
    colorScheme: "dark light",
  },
} as const;
export type Site = typeof site;
