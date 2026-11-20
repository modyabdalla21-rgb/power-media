import { redirect } from "next/navigation";
import { DiscoveryWizard } from "@/components/hub/discovery-wizard";
import { PageHeader } from "@/components/dashboard/primitives";
import { localizedHref } from "@/i18n/config";
import { discoverySchema } from "@/lib/client/discovery";
import { getClientWorkspace } from "@/lib/client/workspace";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/growth">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.growth.title };
}

/** Smart Discovery + AI Growth Diagnosis for the client's own brand. */
export default async function GrowthPage({ params }: PageProps<"/[locale]/dashboard/growth">) {
  const { locale, dict } = await loadPage(params);
  const workspace = await getClientWorkspace();
  const supabase = await createSupabaseServerClient();
  if (!workspace || !supabase) redirect(localizedHref(locale, "/dashboard"));
  if (!workspace.onboarded_at) redirect(localizedHref(locale, "/dashboard/onboarding"));

  const { data } = await supabase.from("clients").select("discovery").eq("id", workspace.id).maybeSingle();
  const saved = discoverySchema.partial().safeParse(data?.discovery ?? {});
  const currency = { egypt: "EGP", ksa: "SAR", uae: "AED", gcc: "SAR" }[workspace.market ?? ""] ?? "EGP";
  const initial = { currency, ...(saved.success ? saved.data : {}) } as Parameters<typeof DiscoveryWizard>[0]["initial"];
  const language = workspace.dialect ?? (locale === "eg" ? "ar_eg" : locale === "ar" ? "ar_msa" : "en");
  const g = dict.dashboard.growth;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={g.title} description={g.subtitle} />
      <DiscoveryWizard d={dict.dashboard} initial={initial} language={language} hubHref={localizedHref(locale, "/dashboard/brand")} />
    </div>
  );
}
