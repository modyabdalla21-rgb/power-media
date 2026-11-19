/**
 * Portfolio & testimonials content. Only add entries that are real and
 * approved by the client in writing. Empty arrays render honest empty states.
 */
export type PortfolioItem = {
  slug: string;
  client: string;
  title: { en: string; ar: string };
  category: "branding" | "performance" | "social" | "video" | "web";
  image: string;
};

export type Testimonial = {
  quote: { en: string; ar: string };
  author: string;
  role: { en: string; ar: string };
  company: string;
};

export const portfolio: PortfolioItem[] = [];
export const testimonials: Testimonial[] = [];
