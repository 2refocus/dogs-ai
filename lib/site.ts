export const SITE = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || "my Pet Portrait Studio",
  subtitle: process.env.NEXT_PUBLIC_SITE_SUBTITLE || "Elegant & cozy portraits of your pets",
  logo: (process.env.NEXT_PUBLIC_SITE_LOGO || "combo") as "dog" | "dog" | "cat"
};
