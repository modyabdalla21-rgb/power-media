"use client";
import { useActionState, useState } from "react";
import { CheckCircle2, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { saveBrandProfile, type BrandProfileState } from "@/lib/client/actions";
import { AssetUploader } from "./asset-uploader";
import { localeMeta, locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

type D = Dictionary["dashboard"];
export type BrandProfileValues = {
  name: string;
  industry: string | null;
  market: string | null;
  audience: string | null;
  tone: string | null;
  dialect: string | null;
  website: string | null;
  brand_notes: string | null;
};

/** Brand profile — onboarding (with identity question) or edit mode. */
export function BrandProfileForm({ mode, d, locale, values, clientId }: { mode: "onboarding" | "profile"; d: D; locale: Locale; values: BrandProfileValues; clientId: string }) {
  const [state, action, pending] = useActionState<BrandProfileState, FormData>(saveBrandProfile, undefined);
  const [market, setMarket] = useState(values.market ?? "");
  const [uiLocale, setUiLocale] = useState<Locale>(locale);
  const [hasIdentity, setHasIdentity] = useState<"yes" | "no">("no");
  const [colors, setColors] = useState("");
  const o = d.onboarding;
  const opts = d.options;
  const bad = new Set(state?.fields ?? []);
  const err = (k: string) => (bad.has(k) ? { "aria-invalid": true as const } : {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kit_name" value={d.brand.existingKitName} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="bp-name" required>{o.brandName}</Label>
          <Input id="bp-name" name="name" required maxLength={160} defaultValue={values.name} {...err("name")} />
        </div>
        <div>
          <Label htmlFor="bp-industry">{o.industry}</Label>
          <Input id="bp-industry" name="industry" maxLength={120} placeholder={o.industryPlaceholder} defaultValue={values.industry ?? ""} {...err("industry")} />
        </div>
        <div>
          <Label htmlFor="bp-market">{o.market}</Label>
          <Select id="bp-market" name="market" value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="">—</option>
            {(["egypt", "ksa", "uae", "gcc", "other"] as const).map((m) => <option key={m} value={m}>{opts[m]}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="bp-dialect">{o.dialect}</Label>
          <Select id="bp-dialect" name="dialect" defaultValue={values.dialect ?? (locale === "eg" ? "ar_eg" : "")}>
            <option value="">—</option>
            {(["ar_eg", "ar_gulf", "ar_msa", "en"] as const).map((k) => <option key={k} value={k}>{opts[k]}</option>)}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bp-audience">{o.audience}</Label>
          <Textarea id="bp-audience" name="audience" rows={2} maxLength={2000} placeholder={o.audiencePlaceholder} defaultValue={values.audience ?? ""} />
        </div>
        <div>
          <Label htmlFor="bp-tone">{o.tone}</Label>
          <Input id="bp-tone" name="tone" maxLength={300} placeholder={o.tonePlaceholder} defaultValue={values.tone ?? ""} />
        </div>
        <div>
          <Label htmlFor="bp-website">{o.website}</Label>
          <Input id="bp-website" name="website" maxLength={300} dir="ltr" className="rtl:text-end" defaultValue={values.website ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bp-notes">{o.notes}</Label>
          <Textarea id="bp-notes" name="brand_notes" rows={2} maxLength={4000} defaultValue={values.brand_notes ?? ""} />
        </div>
      </div>

      {mode === "onboarding" && (
        <fieldset className="space-y-3 rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold">{o.hasIdentity}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["no", "yes"] as const).map((v) => (
              <label key={v} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors", hasIdentity === v ? "border-blue/50 bg-blue/10" : "border-line hover:border-line-strong")}>
                <input type="radio" name="has_identity" value={v} checked={hasIdentity === v} onChange={() => setHasIdentity(v)} className="accent-[var(--color-blue)]" />
                {v === "yes" ? o.hasIdentityYes : o.hasIdentityNo}
              </label>
            ))}
          </div>
          {hasIdentity === "yes" && (
            <div className="space-y-1 pt-1">
              <p className="text-sm font-medium text-ink-muted">{o.logoUpload}</p>
              <p className="text-xs text-ink-subtle">{o.logoUploadHint}</p>
              <AssetUploader
                clientId={clientId}
                kind="logo"
                t={d.brand}
                kitName={d.brand.existingKitName}
                offerColors={false}
                onUploaded={({ colors: detected }) => detected.length && !colors && setColors(detected.join(", "))}
              />
            </div>
          )}
          {hasIdentity === "yes" && (
            <div className="grid gap-4 pt-1 sm:grid-cols-2">
              <div>
                <Label htmlFor="bp-logo">{o.logoUrl}</Label>
                <Input id="bp-logo" name="logo_url" type="url" dir="ltr" className="rtl:text-end" placeholder="https://…" {...err("logo_url")} />
              </div>
              <div>
                <Label htmlFor="bp-colors">{o.colors}</Label>
                <Input id="bp-colors" name="colors" dir="ltr" className="rtl:text-end" placeholder={o.colorsPlaceholder} value={colors} onChange={(e) => setColors(e.target.value)} />
              </div>
            </div>
          )}
        </fieldset>
      )}

      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div>
          <Label htmlFor="bp-ui">{o.uiLanguage}</Label>
          <Select id="bp-ui" name="ui_locale" value={uiLocale} onChange={(e) => setUiLocale(e.target.value as Locale)}>
            {locales.map((l) => <option key={l} value={l}>{localeMeta[l].label}</option>)}
          </Select>
        </div>
        {market === "egypt" && uiLocale !== "eg" && (
          <button type="button" onClick={() => setUiLocale("eg")} className="flex items-start gap-2 rounded-lg border border-orange/30 bg-orange/10 p-2.5 text-start text-xs text-yellow hover:bg-orange/15">
            <Languages className="mt-0.5 size-4 shrink-0" aria-hidden />
            {o.egyptTip}
          </button>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span aria-live="polite" className="text-sm">
          {state?.ok && <span className="inline-flex items-center gap-1.5 text-blue-300"><CheckCircle2 className="size-4" aria-hidden />{d.brand.saved}</span>}
          {state?.error && <span className="text-yellow">{o.error}</span>}
        </span>
        <Button type="submit" size="lg" variant={mode === "onboarding" ? "energy" : "primary"} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? o.saving : mode === "onboarding" ? o.submit : d.crud.save}
        </Button>
      </div>
    </form>
  );
}
