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
  /** "image": a product photo from the brand's uploads (asset id). */
  type: "text" | "textarea" | "select" | "number" | "date" | "client" | "project" | "image";
  required?: boolean;
  label: L;
  placeholder?: L;
  options?: Opt[];
  defaultValue?: string;
  max?: number;
  wide?: boolean;
};

export type ToolKey =
  | "adStudio" | "mediaPlanner" | "reportGenerator" | "brandIdentity" | "brandAnalysis" | "growthPlan" | "offerAngles" | "growthDiagnosis"
  | "marketingStrategy" | "metaAds" | "staticPost";

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
  /** Markdown text, or structured JSON (identity / brand analysis / growth plan). */
  output: "markdown" | "identity" | "analysis" | "plan" | "diagnosis" | "post";
  /** Run from the Brand hub, not listed as a standalone tool. */
  hub?: boolean;
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
          { value: "reels_shoot", label: { en: "Reels / TikTok shooting script (scenes + spoken lines)", ar: "سيناريو تصوير ريلز / تيك توك (مشاهد + حوار)" } },
          { value: "content_calendar", label: { en: "7-day content calendar", ar: "خطة محتوى لمدة 7 أيام" } },
        ],
      },
      { name: "language", type: "select", required: true, label: { en: "Language / dialect", ar: "اللغة / اللهجة" }, options: dialects, defaultValue: "ar_eg" },
      {
        name: "framework",
        type: "select",
        label: { en: "Copywriting framework", ar: "إطار الكتابة" },
        defaultValue: "auto",
        options: [
          { value: "auto", label: { en: "Best fit (AI picks per variation)", ar: "الأنسب (يختار الذكاء الاصطناعي لكل نسخة)" } },
          { value: "hso", label: { en: "Hook – Story – Offer", ar: "خطّاف – قصة – عرض" } },
          { value: "pas", label: { en: "PAS — Problem, Agitate, Solve", ar: "PAS — مشكلة، تضخيم، حل" } },
          { value: "aida", label: { en: "AIDA — Attention, Interest, Desire, Action", ar: "AIDA — انتباه، اهتمام، رغبة، فعل" } },
          { value: "bab", label: { en: "Before – After – Bridge", ar: "قبل – بعد – الجسر" } },
        ],
      },
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

const hubLanguages: Opt[] = [
  { value: "en", label: { en: "English", ar: "الإنجليزية" } },
  { value: "ar_msa", label: { en: "Arabic (Modern Standard)", ar: "العربية (الفصحى)" } },
  { value: "ar_eg", label: { en: "Arabic — Egyptian", ar: "العربية — المصرية" } },
  { value: "ar_gulf", label: { en: "Arabic — Gulf / Saudi", ar: "العربية — الخليجية" } },
];

aiTools.push(
  {
    key: "brandAnalysis",
    slug: "brand-analysis",
    access: "all",
    output: "analysis",
    quota: "ai",
    hub: true,
    languageField: "language",
    titleField: "focus",
    fields: [
      { ...client, required: true, label: { en: "Client", ar: "العميل" } },
      { name: "focus", type: "textarea", max: 600, label: { en: "What do you want to achieve right now? (optional)", ar: "ما الذي تريد تحقيقه الآن؟ (اختياري)" } },
      { name: "language", type: "select", required: true, label: { en: "Language", ar: "اللغة" }, options: hubLanguages, defaultValue: "en" },
    ],
  },
  {
    key: "growthPlan",
    slug: "growth-plan",
    access: "all",
    output: "plan",
    quota: "ai",
    hub: true,
    languageField: "language",
    titleField: "goal",
    fields: [
      { ...client, required: true, label: { en: "Client", ar: "العميل" } },
      { name: "goal", type: "text", required: true, max: 300, label: { en: "Goal", ar: "الهدف" } },
      {
        name: "horizon",
        type: "select",
        required: true,
        label: { en: "Timeframe", ar: "المدة" },
        defaultValue: "1m",
        options: [
          { value: "2w", label: { en: "2 weeks", ar: "أسبوعان" } },
          { value: "1m", label: { en: "1 month", ar: "شهر" } },
          { value: "3m", label: { en: "3 months", ar: "3 أشهر" } },
        ],
      },
      { name: "budget", type: "number", label: { en: "Ad budget (optional)", ar: "ميزانية الإعلانات (اختياري)" } },
      { name: "currency", type: "select", label: { en: "Currency", ar: "العملة" }, options: currencies, defaultValue: "EGP" },
      { name: "channels", type: "text", max: 200, label: { en: "Channels you use (optional)", ar: "القنوات التي تستخدمها (اختياري)" } },
      { name: "language", type: "select", required: true, label: { en: "Language", ar: "اللغة" }, options: hubLanguages, defaultValue: "en" },
    ],
  },
);

aiTools.push(
  {
    key: "offerAngles",
    slug: "offer-angles",
    access: "all",
    output: "markdown",
    quota: "ai",
    languageField: "language",
    titleField: "product",
    fields: [
      { name: "product", type: "text", required: true, max: 200, label: { en: "Product / service", ar: "المنتج / الخدمة" }, placeholder: { en: "e.g. Handmade leather wallet", ar: "مثال: محفظة جلد هاند ميد" } },
      { name: "price", type: "text", max: 100, label: { en: "Your price", ar: "سعرك" }, placeholder: { en: "e.g. 650 EGP", ar: "مثال: 650 جنيه" } },
      { name: "usp", type: "textarea", label: { en: "What's included / what makes it different", ar: "ماذا يشمل / ما الذي يميّزه" } },
      { name: "competitors", type: "textarea", wide: true, label: { en: "Competitors (names, prices, their offers — what you know)", ar: "المنافسون (الأسماء، الأسعار، عروضهم — ما تعرفه)" }, placeholder: { en: "e.g. Brand X — 450 EGP, free shipping over 1,000", ar: "مثال: براند X — 450 جنيه، شحن مجاني فوق 1,000" } },
      audience,
      { name: "market", type: "select", required: true, label: { en: "Market", ar: "السوق" }, options: markets, defaultValue: "egypt" },
      { name: "language", type: "select", required: true, label: { en: "Language / dialect", ar: "اللغة / اللهجة" }, options: dialects, defaultValue: "ar_eg" },
      client,
    ],
  },
  {
    key: "growthDiagnosis",
    slug: "growth-diagnosis",
    access: "all",
    output: "diagnosis",
    quota: "ai",
    hub: true,
    languageField: "language",
    titleField: "language",
    fields: [
      { ...client, required: true, label: { en: "Client", ar: "العميل" } },
      {
        name: "horizon",
        type: "select",
        required: true,
        label: { en: "Roadmap timeframe", ar: "مدة خارطة الطريق" },
        defaultValue: "1m",
        options: [
          { value: "2w", label: { en: "2 weeks", ar: "أسبوعان" } },
          { value: "1m", label: { en: "1 month", ar: "شهر" } },
          { value: "3m", label: { en: "3 months", ar: "3 أشهر" } },
        ],
      },
      { name: "language", type: "select", required: true, label: { en: "Language", ar: "اللغة" }, options: dialects, defaultValue: "en" },
    ],
  },
);

const objectives: Opt[] = [
  { value: "sales", label: { en: "Online sales", ar: "مبيعات أونلاين" } },
  { value: "messages", label: { en: "WhatsApp / Messenger orders", ar: "طلبات واتساب / ماسنجر" } },
  { value: "leads", label: { en: "Leads", ar: "عملاء محتملون" } },
  { value: "traffic", label: { en: "Website traffic", ar: "زيارات الموقع" } },
  { value: "awareness", label: { en: "Awareness & reach", ar: "الوعي والوصول" } },
];

aiTools.push(
  {
    key: "marketingStrategy",
    slug: "marketing-strategy",
    access: "all",
    output: "markdown",
    quota: "ai",
    languageField: "language",
    titleField: "goal",
    fields: [
      { name: "goal", type: "text", required: true, max: 300, label: { en: "Main business goal", ar: "الهدف الرئيسي" }, placeholder: { en: "e.g. 300 orders a month from Instagram & WhatsApp", ar: "مثال: 300 طلب شهريًا من إنستجرام وواتساب" } },
      { name: "offer", type: "text", max: 300, label: { en: "Product / service focus", ar: "المنتج / الخدمة الأساسية" } },
      { name: "challenge", type: "textarea", label: { en: "Biggest challenge right now", ar: "أكبر تحدٍّ حاليًا" }, placeholder: { en: "e.g. lots of views, few orders; competitors are cheaper", ar: "مثال: مشاهدات كثيرة وطلبات قليلة؛ المنافسون أرخص" } },
      audience,
      { name: "channels", type: "text", max: 200, label: { en: "Channels you use now", ar: "القنوات التي تستخدمها الآن" }, placeholder: { en: "e.g. Instagram, WhatsApp, TikTok", ar: "مثال: إنستجرام، واتساب، تيك توك" } },
      { name: "budget", type: "number", label: { en: "Monthly marketing budget (optional)", ar: "ميزانية التسويق الشهرية (اختياري)" } },
      { name: "currency", type: "select", label: { en: "Currency", ar: "العملة" }, options: currencies, defaultValue: "EGP" },
      {
        name: "horizon",
        type: "select",
        required: true,
        label: { en: "Strategy horizon", ar: "مدة الاستراتيجية" },
        defaultValue: "3m",
        options: [
          { value: "1m", label: { en: "1 month", ar: "شهر" } },
          { value: "3m", label: { en: "3 months", ar: "3 أشهر" } },
          { value: "6m", label: { en: "6 months", ar: "6 أشهر" } },
        ],
      },
      { name: "market", type: "select", required: true, label: { en: "Market", ar: "السوق" }, options: markets, defaultValue: "egypt" },
      { name: "language", type: "select", required: true, label: { en: "Language / dialect", ar: "اللغة / اللهجة" }, options: dialects, defaultValue: "ar_eg" },
      client,
    ],
  },
  {
    key: "metaAds",
    slug: "meta-ads-strategy",
    access: "all",
    output: "markdown",
    quota: "ai",
    languageField: "language",
    titleField: "offer",
    fields: [
      { name: "offer", type: "text", required: true, max: 300, label: { en: "Product / offer to advertise", ar: "المنتج / العرض المُعلن عنه" }, placeholder: { en: "e.g. Summer bundle — 2 pieces for 899 EGP", ar: "مثال: باكدج الصيف — قطعتين بـ 899 جنيه" } },
      { name: "objective", type: "select", required: true, label: { en: "Campaign goal", ar: "هدف الحملة" }, options: objectives, defaultValue: "messages" },
      { name: "budget", type: "number", label: { en: "Monthly ad budget", ar: "ميزانية الإعلانات الشهرية" } },
      { name: "currency", type: "select", label: { en: "Currency", ar: "العملة" }, options: currencies, defaultValue: "EGP" },
      {
        name: "stage",
        type: "select",
        required: true,
        label: { en: "Where are your ads now?", ar: "وضع إعلاناتك الآن" },
        defaultValue: "new",
        options: [
          { value: "new", label: { en: "Starting from zero", ar: "سأبدأ من الصفر" } },
          { value: "running", label: { en: "Running, results are weak", ar: "تعمل لكن النتائج ضعيفة" } },
          { value: "scaling", label: { en: "Working, want to scale", ar: "تعمل وأريد التوسّع" } },
        ],
      },
      {
        name: "destination",
        type: "select",
        required: true,
        label: { en: "Where should people go?", ar: "إلى أين يذهب العميل؟" },
        defaultValue: "whatsapp",
        options: [
          { value: "whatsapp", label: { en: "WhatsApp chat", ar: "محادثة واتساب" } },
          { value: "instagram", label: { en: "Instagram DM", ar: "رسائل إنستجرام" } },
          { value: "website", label: { en: "Website / store", ar: "الموقع / المتجر" } },
          { value: "lead_form", label: { en: "Instant form", ar: "نموذج فوري" } },
        ],
      },
      audience,
      { name: "performance", type: "textarea", label: { en: "Past results (optional)", ar: "نتائج سابقة (اختياري)" }, placeholder: { en: "e.g. cost per message 12 EGP, CTR 0.8%", ar: "مثال: تكلفة الرسالة 12 جنيه، نسبة النقر 0.8%" } },
      { name: "market", type: "select", required: true, label: { en: "Market", ar: "السوق" }, options: markets, defaultValue: "egypt" },
      { name: "language", type: "select", required: true, label: { en: "Ad language / dialect", ar: "لغة / لهجة الإعلانات" }, options: dialects, defaultValue: "ar_eg" },
      client,
    ],
  },
  {
    key: "staticPost",
    slug: "static-post-studio",
    access: "all",
    output: "post",
    quota: "ai",
    languageField: "language",
    titleField: "product",
    fields: [
      { name: "image", type: "image", wide: true, label: { en: "Product image", ar: "صورة المنتج" } },
      { name: "product", type: "text", required: true, max: 200, label: { en: "Product / service", ar: "المنتج / الخدمة" }, placeholder: { en: "e.g. Vitamin C glow serum 30ml", ar: "مثال: سيروم فيتامين سي 30 مل" } },
      { name: "offer", type: "text", max: 200, label: { en: "Offer / price (optional)", ar: "العرض / السعر (اختياري)" }, placeholder: { en: "e.g. 20% off this week — 399 EGP", ar: "مثال: خصم 20% الأسبوع ده — 399 جنيه" } },
      { name: "message", type: "textarea", label: { en: "Key message or benefit", ar: "الرسالة أو الميزة الأساسية" } },
      {
        name: "goal",
        type: "select",
        required: true,
        label: { en: "Post goal", ar: "هدف البوست" },
        defaultValue: "sell",
        options: [
          { value: "sell", label: { en: "Sell / promote an offer", ar: "بيع / ترويج عرض" } },
          { value: "launch", label: { en: "Launch a new product", ar: "إطلاق منتج جديد" } },
          { value: "awareness", label: { en: "Brand awareness", ar: "التعريف بالعلامة" } },
          { value: "engage", label: { en: "Engagement", ar: "التفاعل" } },
        ],
      },
      {
        name: "format",
        type: "select",
        required: true,
        label: { en: "Format", ar: "المقاس" },
        defaultValue: "square",
        options: [
          { value: "square", label: { en: "Feed post 1:1", ar: "بوست 1:1" } },
          { value: "portrait", label: { en: "Feed portrait 4:5", ar: "بوست طولي 4:5" } },
          { value: "story", label: { en: "Story 9:16", ar: "ستوري 9:16" } },
        ],
      },
      { name: "cta", type: "text", max: 60, label: { en: "Call to action (optional)", ar: "الدعوة لاتخاذ إجراء (اختياري)" }, placeholder: { en: "e.g. Order on WhatsApp", ar: "مثال: اطلب على واتساب" } },
      { name: "language", type: "select", required: true, label: { en: "Language / dialect", ar: "اللغة / اللهجة" }, options: dialects, defaultValue: "ar_eg" },
      client,
    ],
  },
);

export const getToolBySlug = (slug: string) => aiTools.find((t) => t.slug === slug);
export const getToolByKey = (key: string) => aiTools.find((t) => t.key === key);
