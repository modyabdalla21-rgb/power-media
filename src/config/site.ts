/**
 * Site-wide configuration. Fill in real contact details before launch —
 * empty values are hidden in the UI rather than replaced with fake ones.
 */
export const siteConfig = {
  name: "POWER MEDIA",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  whatsapp: "",
  social: {
    instagram: "",
    linkedin: "",
    tiktok: "",
    x: "",
  },
};

/** Public navigation (dictionary keys under `nav`). */
export const publicNav = [
  { key: "about", href: "/about" },
  { key: "services", href: "/services" },
  { key: "work", href: "/work" },
  { key: "caseStudies", href: "/case-studies" },
  { key: "powerAi", href: "/power-ai" },
  { key: "pricing", href: "/pricing" },
] as const;
