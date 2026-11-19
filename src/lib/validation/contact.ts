import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  company: z.string().trim().max(160).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  service: z.string().trim().max(80).optional().default(""),
  budget: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(["en", "ar", "eg"]).transform((l) => (l === "eg" ? "ar" : l)).default("en"),
  /** Honeypot — bots fill it, humans never see it. */
  website: z.string().max(0).optional().default(""),
});

export type ContactInput = z.input<typeof contactSchema>;
