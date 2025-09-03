export const SITE = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || "Nano Banana Pet Portraits",
  subtitle: process.env.NEXT_PUBLIC_SITE_SUBTITLE || "Elegant & cozy portraits of your pets",
  logo: (process.env.NEXT_PUBLIC_SITE_LOGO || "combo") as "combo" | "dog" | "cat"
};
