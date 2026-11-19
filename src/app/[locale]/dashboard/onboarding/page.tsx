import { redirect } from "next/navigation";
import { BrandProfileForm } from "@/components/client/brand-profile-form";
import { Eyebrow } from "@/components/ui/section-heading";
import { localizedHref } from "@/i18n/config";
import { getClientWorkspace } from "@/lib/client/workspace";
import { loadPage } from "@/lib/page";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/onboarding">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.onboarding.title };
}

/** First-login brand setup for self-serve clients. */
export default async function OnboardingPage({ params }: PageProps<"/[locale]/dashboard/onboarding">) {
  const { locale, dict } = await loadPage(params);
  const workspace = await getClientWorkspace();
  if (!workspace) redirect(localizedHref(locale, "/dashboard"));
  const o = dict.dashboard.onboarding;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Eyebrow>{o.eyebrow}</Eyebrow>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{o.title}</h1>
        <p className="mt-2 text-ink-muted">{o.subtitle}</p>
      </div>
      <ol className="grid grid-cols-3 gap-2" aria-label={o.title}>
        {o.steps.map((step, i) => (
          <li key={step} className={cn("rounded-xl border px-3 py-2.5 text-xs sm:text-sm", i === 0 ? "border-blue/50 bg-blue/10 text-white" : "border-line text-ink-subtle")} aria-current={i === 0 ? "step" : undefined}>
            <span className="font-bold tabular-nums">{i + 1}.</span> {step}
          </li>
        ))}
      </ol>
      <div className="surface-card p-6 sm:p-8">
        <BrandProfileForm mode="onboarding" d={dict.dashboard} locale={locale} values={workspace} />
      </div>
    </div>
  );
}
