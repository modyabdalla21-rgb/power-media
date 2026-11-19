/**
 * POWER AI tool registry — single source of truth for each tool's slug,
 * dictionary key and input schema. Used by the UI (forms) and the API
 * (server-side validation). Prompts live in ./prompts.ts (server only).
 */
import type { ContentLocale } from "@/i18n/config";

type L = Record<ContentLocale, string>;
type Opt = { value: string; label: L };

export type ToolField = {
  name: string;
  type: "text" | "textarea" | "select" | "number" | "date" | "client" | "project";
  required?: boolean;
  label: L;
  placeholder?: L;
  options?: Opt[];
  defaultValue?: string;
  max?: number;
  wide?: boolean;
};

export type ToolKey = "adStudio" | "mediaPlanner" | "reportGenerator" | "brandIdentity";

export type ToolDefinition = {
  key: ToolKey;
  slug: string;
  fields: ToolField[];
  /** Field holding the output language/dialect. */
  languageField: string;
  /** Field used to build the saved generation's title. */
  titleField: string;
  /** "all": clients can use it in their workspace (counts toward their plan). */
  access: "staff" | "all";
  /** Markdown text, or structured brand identity JSON. */
  output: "markdown" | "identity";
  /** Which plan quota a client generation consumes. */
  quota: "ai" | "identity";
};

export const OUTPUT_LANGUAGES = ["en", "ar_msa", "ar_eg", "ar_gulf"] as const;
export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number];
export const isArabicOutput = (lang: string) => lang.startsWith("ar");

const dialects: Opt[] = [
  { value: "en", label: { en: "English", ar: "الإنجليزية" } },
  { value: "ar_eg", label: { en: "Arabic — Egyptian", ar: "العربية — اللهجة المصرية" } },
  { value: "ar_gulf", label: { en: "Arabic — Gulf / Saudi", ar: "العربية — اللهجة الخليجية / السعودية" } },
  { value: "ar_msa", label: { en: "Arabic — Modern Standard", ar: "العربية — الفصحى" } },
];
const reportLanguages: Opt[] = [
  { value: "en", label: { en: "English", ar: "الإنجليزية" } },
  { value: "ar_msa", label: { en: "Arabic (Modern Standard)", ar: "العربية (الفصحى)" } },
];
const markets: Opt[] = [
  { value: "egypt", label: { en: "Egypt", ar: "مصر" } },
  { value: "ksa", label: { en: "Saudi Arabia", ar: "السعودية" } },
  { value: "uae", label: { en: "UAE", ar: "الإمارات" } },
  { value: "gcc", label: { en: "GCC (multi-market)", ar: "الخليج (عدة أسواق)" } },
];
const currencies: Opt[] = ["EGP", "SAR", "AED", "USD"].map((c) => ({ value: c, label: { en: c, ar: c } }));

const client: ToolField = { name: "client_id", type: "client", label: { en: "Link to client", ar: "ربط بعميل" } };
const project: ToolField = { name: "project_id", type: "project", label: { en: "Link to project", ar: "ربط بمشروع" } };
const audience: ToolField = {
  name: "audience",
  type: "textarea",
  label: { en: "Target audience", ar: "الجمهور المستهدف" },
  placeholder: { en: "Who are they? Age, city, interests, pain points…", ar: "من هم؟ العمر، المدينة، الاهتمامات، المشكلات…" },
};

export const aiTools: ToolDefinition[] = [
  {
    key: "adStudio",
    slug: "ad-copy-studio",
    access: "all",
    output: "markdown",
    quota: "ai",
    languageField: "language",
    titleField: "offer",
    fields: [
      {
        name: "format",
        type: "select",
        required: true,
        label: { en: "Format", ar: "الصيغة" },
        defaultValue: "meta_ad",
        options: [
          { value: "meta_ad", label: { en: "Meta ad (Facebook & Instagram)", ar: "إعلان ميتا (فيسبوك وإنستغرام)" } },
          { value: "tiktok_ad", label: { en: "TikTok ad", ar: "إعلان تيك توك" } },
          { value: "google_search_ad", label: { en: "Google Search ad (RSA)", ar: "إعلان بحث جوجل" } },
          { value: "social_post", label: { en: "Organic social posts", ar: "منشورات سوشيال عضوية" } },
          { value: "video_script", label: { en: "Short video script (Reels / TikTok)", ar: "سيناريو فيديو قصير (ريلز / تيك توك)" } },
        ],
      },
      { name: "language", type: "select", required: true, label: { en: "Language / dialect", ar: "اللغة / اللهجة" }, options: dialects, defaultValue: "ar_eg" },
      { name: "offer", type: "text", required: true, max: 200, label: { en: "Product / offer", ar: "المنتج / العرض" }, placeholder: { en: "e.g. Summer skincare bundle — 20% off", ar: "مثال: باقة العناية بالبشرة الصيفية — خصم 20٪" } },
      { name: "brand", type: "text", max: 120, label: { en: "Brand name", ar: "اسم العلامة" } },
      audience,
      { name: "message", type: "textarea", label: { en: "Key message / USP", ar: "الرسالة الرئيسية / الميزة التنافسية" } },
      {
        name: "tone",
        type: "select",
        label: { en: "Tone", ar: "النبرة" },
        defaultValue: "bold",
        options: [
          { value: "bold", label: { en: "Bold & energetic", ar: "جريئة وحماسية" } },
          { value: "friendly", label: { en: "Friendly", ar: "ودّية" } },
          { value: "premium", label: { en: "Premium", ar: "فاخرة" } },
          { value: "playful", label: { en: "Playful", ar: "مرحة" } },
          { value: "professional", label: { en: "Professional", ar: "احترافية" } },
        ],
      },
      { name: "cta", type: "text", max: 80, label: { en: "Call to action", ar: "الدعوة لاتخاذ إجراء" }, placeholder: { en: "e.g. Order on WhatsApp", ar: "مثال: اطلب على واتساب" } },
      {
        name: "variations",
        type: "select",
        label: { en: "Variations", ar: "عدد النسخ" },
        defaultValue: "3",
        options: ["1", "3", "5"].map((v) => ({ value: v, label: { en: v, ar: v } })),
      },
      client,
      project,
    ],
  },
  {
    key: "mediaPlanner",
    slug: "campaign-media-planner",
    access: "all",
    output: "markdown",
    quota: "ai",
    languageField: "language",
    titleField: "offer",
    fields: [
      { name: "offer", type: "text", required: true, max: 200, label: { en: "Product / offer", ar: "المنتج / العرض" } },
      {
        name: "objective",
        type: "select",
        required: true,
        label: { en: "Objective", ar: "الهدف" },
        defaultValue: "sales",
        options: [
          { value: "sales", label: { en: "Sales / purchases", ar: "المبيعات" } },
          { value: "leads", label: { en: "Leads", ar: "العملاء المحتملون" } },
          { value: "messages", label: { en: "WhatsApp / Messenger conversations", ar: "محادثات واتساب / ماسنجر" } },
          { value: "traffic", label: { en: "Traffic", ar: "الزيارات" } },
          { value: "awareness", label: { en: "Awareness", ar: "الوعي" } },
          { value: "app", label: { en: "App installs", ar: "تثبيت التطبيق" } },
        ],
      },
      { name: "market", type: "select", required: true, label: { en: "Market", ar: "السوق" }, options: markets, defaultValue: "egypt" },
      { name: "budget", type: "number", required: true, label: { en: "Total budget", ar: "إجمالي الميزانية" } },
      { name: "currency", type: "select", required: true, label: { en: "Currency", ar: "العملة" }, options: currencies, defaultValue: "EGP" },
      {
        name: "duration",
        type: "select",
        required: true,
        label: { en: "Duration", ar: "المدة" },
        defaultValue: "1m",
        options: [
          { value: "2w", label: { en: "2 weeks", ar: "أسبوعان" } },
          { value: "1m", label: { en: "1 month", ar: "شهر" } },
          { value: "3m", label: { en: "3 months", ar: "3 أشهر" } },
        ],
      },
      { name: "platforms", type: "text", max: 200, label: { en: "Preferred platforms (optional)", ar: "المنصات المفضّلة (اختياري)" }, placeholder: { en: "Meta, TikTok, Snapchat, Google…", ar: "ميتا، تيك توك، سناب شات، جوجل…" } },
      audience,
      { name: "performance", type: "textarea", label: { en: "Past performance (optional)", ar: "الأداء السابق (اختياري)" }, placeholder: { en: "CPM, CTR, CPA, ROAS from previous campaigns…", ar: "CPM، CTR، CPA، ROAS من حملات سابقة…" } },
      { name: "language", type: "select", required: true, label: { en: "Output language", ar: "لغة المخرجات" }, options: reportLanguages, defaultValue: "en" },
      client,
      project,
    ],
  },
  {
    key: "reportGenerator",
    slug: "client-report-generator",
    access: "staff",
    output: "markdown",
    quota: "ai",
    languageField: "language",
    titleField: "client_id",
    fields: [
      { ...client, required: true, label: { en: "Client", ar: "العميل" } },
      { ...project, label: { en: "Project (optional — focuses the report)", ar: "المشروع (اختياري — لتركيز التقرير)" } },
      { name: "period_start", type: "date", required: true, label: { en: "Period start", ar: "بداية الفترة" } },
      { name: "period_end", type: "date", required: true, label: { en: "Period end", ar: "نهاية الفترة" } },
      {
        name: "metrics",
        type: "textarea",
        wide: true,
        label: { en: "Results & metrics", ar: "النتائج والمؤشرات" },
        placeholder: { en: "Paste real numbers: spend, reach, clicks, leads, sales, ROAS… The report will only use figures you provide.", ar: "الصق الأرقام الفعلية: الإنفاق، الوصول، النقرات، العملاء المحتملون، المبيعات، العائد… لن يستخدم التقرير إلا الأرقام التي تقدّمها." },
      },
      { name: "highlights", type: "textarea", wide: true, label: { en: "Highlights & notes", ar: "أبرز النقاط والملاحظات" } },
      { name: "next_steps", type: "textarea", wide: true, label: { en: "Planned next steps", ar: "الخطوات القادمة المخطط لها" } },
      { name: "language", type: "select", required: true, label: { en: "Report language", ar: "لغة التقرير" }, options: reportLanguages, defaultValue: "en" },
    ],
  },
];

aiTools.push({
  key: "brandIdentity",
  slug: "brand-identity",
  access: "all",
  output: "identity",
  quota: "identity",
  languageField: "language",
  titleField: "brand",
  fields: [
    { ...client, required: true, label: { en: "Client", ar: "العميل" } },
    { name: "brand", type: "text", required: true, max: 120, label: { en: "Brand name", ar: "اسم العلامة" } },
    { name: "industry", type: "text", required: true, max: 160, label: { en: "Industry / niche", ar: "المجال / التخصص" } },
    { name: "market", type: "select", required: true, label: { en: "Main market", ar: "السوق الرئيسي" }, options: markets, defaultValue: "egypt" },
    audience,
    { name: "personality", type: "text", max: 200, label: { en: "Brand personality / tone", ar: "شخصية العلامة / النبرة" }, placeholder: { en: "e.g. warm, witty, premium", ar: "مثال: دافئة، ذكية، فاخرة" } },
    {
      name: "style",
      type: "select",
      required: true,
      label: { en: "Visual style", ar: "الأسلوب البصري" },
      defaultValue: "modern_minimal",
      options: [
        { value: "modern_minimal", label: { en: "Modern & minimal", ar: "عصري وبسيط" } },
        { value: "bold_energetic", label: { en: "Bold & energetic", ar: "جريء وحيوي" } },
        { value: "luxury_elegant", label: { en: "Luxury & elegant", ar: "فاخر وأنيق" } },
        { value: "playful_friendly", label: { en: "Playful & friendly", ar: "مرح وودود" } },
        { value: "heritage_arabic", label: { en: "Heritage / Arabic calligraphic", ar: "تراثي / خط عربي" } },
        { value: "tech_futuristic", label: { en: "Tech & futuristic", ar: "تقني ومستقبلي" } },
      ],
    },
    { name: "colors", type: "text", max: 200, label: { en: "Color preferences (optional)", ar: "تفضيلات الألوان (اختياري)" }, placeholder: { en: "e.g. earthy tones, no pink", ar: "مثال: ألوان ترابية، بدون وردي" } },
    { name: "avoid", type: "text", max: 200, label: { en: "Anything to avoid (optional)", ar: "أشياء تريد تجنّبها (اختياري)" } },
    {
      name: "language",
      type: "select",
      required: true,
      label: { en: "Language of the identity text", ar: "لغة نصوص الهوية" },
      defaultValue: "en",
      options: [
        { value: "en", label: { en: "English", ar: "الإنجليزية" } },
        { value: "ar_msa", label: { en: "Arabic (Modern Standard)", ar: "العربية (الفصحى)" } },
        { value: "ar_eg", label: { en: "Arabic — Egyptian", ar: "العربية — المصرية" } },
        { value: "ar_gulf", label: { en: "Arabic — Gulf / Saudi", ar: "العربية — الخليجية" } },
      ],
    },
  ],
});

export const getToolBySlug = (slug: string) => aiTools.find((t) => t.slug === slug);
export const getToolByKey = (key: string) => aiTools.find((t) => t.key === key);
