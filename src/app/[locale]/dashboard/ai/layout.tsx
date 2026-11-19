import { redirect } from "next/navigation";
import { localizedHref } from "@/i18n/config";
import { loadPage } from "@/lib/page";
import { getCurrentProfile } from "@/lib/supabase/server";

/** POWER AI tools are staff-only until the SaaS plans launch (Phase 4). */
export default async function AiLayout({ children, params }: LayoutProps<"/[locale]/dashboard/ai">) {
  const { locale } = await loadPage(params);
  const profile = await getCurrentProfile();
  if (profile?.role === "client") redirect(localizedHref(locale, "/dashboard"));
  return children;
}
