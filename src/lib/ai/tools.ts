/**
 * POWER AI tool registry — single source of truth for each tool's slug,
 * dictionary key and input schema. Used by the UI (forms) and the API
 * (server-side validation + prompt building).
 */
import type { Locale } from "@/i18n/config";

type L = Record<Locale, string>;

export type ToolField = {
  name: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  label: L;
  placeholder?: L;
  options?: { value: string; label: L }[];
};

export type ToolKey =
  | "strategist"
  | "copywriter"
  | "creative"
  | "mediaBuying"
  | "contentPlanner"
  | "competitor"
  | "landingPage";

export type ToolDefinition = {
  key: ToolKey;
  slug: string;
  fields: ToolField[];
  /** Instructions for the model; finalised in Phase 3. */
  systemPrompt: string;
};

const markets: ToolField["options"] = [
  { value: "egypt", label: { en: "Egypt", ar: "مصر" } },
  { value: "ksa", label: { en: "Saudi Arabia", ar: "السعودية" } },
  { value: "uae", label: { en: "UAE", ar: "الإمارات" } },
  { value: "gcc", label: { en: "GCC (multi-market)", ar: "الخليج (عدة أسواق)" } },
];

const dialects: ToolField["options"] = [
  { value: "msa", label: { en: "Modern Standard Arabic", ar: "العربية الفصحى" } },
  { value: "egyptian", label: { en: "Egyptian Arabic", ar: "اللهجة المصرية" } },
  { value: "gulf", label: { en: "Gulf / Saudi Arabic", ar: "اللهجة الخليجية / السعودية" } },
];

const audience: ToolField = {
  name: "audience",
  type: "textarea",
  label: { en: "Target audience", ar: "الجمهور المستهدف" },
  placeholder: { en: "Who are they? Age, location, interests, pain points…", ar: "من هم؟ العمر، الموقع، الاهتمامات، المشكلات…" },
};

export const aiTools: ToolDefinition[] = [
  {
    key: "strategist",
    slug: "marketing-strategist",
    systemPrompt:
      "You are a senior marketing strategist for MENA brands. Produce a structured full-funnel strategy: positioning, audiences, channel mix, budget split, KPIs and a 90-day roadmap.",
    fields: [
      { name: "brand", type: "text", required: true, label: { en: "Brand / product", ar: "العلامة / المنتج" } },
      { name: "industry", type: "text", label: { en: "Industry", ar: "القطاع" } },
      { name: "market", type: "select", required: true, label: { en: "Market", ar: "السوق" }, options: markets },
      audience,
      {
        name: "goal",
        type: "select",
        required: true,
        label: { en: "Primary goal", ar: "الهدف الرئيسي" },
        options: [
          { value: "awareness", label: { en: "Brand awareness", ar: "الوعي بالعلامة" } },
          { value: "leads", label: { en: "Lead generation", ar: "جذب العملاء المحتملين" } },
          { value: "sales", label: { en: "Online sales", ar: "المبيعات الإلكترونية" } },
          { value: "app", label: { en: "App installs", ar: "تثبيت التطبيق" } },
        ],
      },
      { name: "budget", type: "text", label: { en: "Monthly budget", ar: "الميزانية الشهرية" }, placeholder: { en: "e.g. 150,000 EGP", ar: "مثال: 150,000 جنيه" } },
    ],
  },
  {
    key: "copywriter",
    slug: "ad-copywriter",
    systemPrompt:
      "You are an expert direct-response copywriter fluent in English and Arabic dialects. Write platform-native ad copy variations with hooks, primary text, headlines and CTAs.",
    fields: [
      { name: "product", type: "text", required: true, label: { en: "Product / offer", ar: "المنتج / العرض" } },
      audience,
      {
        name: "platform",
        type: "select",
        required: true,
        label: { en: "Platform", ar: "المنصة" },
        options: [
          { value: "meta", label: { en: "Facebook & Instagram", ar: "فيسبوك وإنستغرام" } },
          { value: "tiktok", label: { en: "TikTok", ar: "تيك توك" } },
          { value: "snapchat", label: { en: "Snapchat", ar: "سناب شات" } },
          { value: "google", label: { en: "Google Search", ar: "بحث جوجل" } },
          { value: "x", label: { en: "X (Twitter)", ar: "إكس (تويتر)" } },
          { value: "linkedin", label: { en: "LinkedIn", ar: "لينكدإن" } },
        ],
      },
      {
        name: "framework",
        type: "select",
        label: { en: "Copy framework", ar: "إطار الكتابة" },
        options: [
          { value: "aida", label: { en: "AIDA", ar: "AIDA" } },
          { value: "pas", label: { en: "PAS", ar: "PAS" } },
          { value: "bab", label: { en: "Before–After–Bridge", ar: "قبل–بعد–الجسر" } },
          { value: "hso", label: { en: "Hook–Story–Offer", ar: "خطّاف–قصة–عرض" } },
        ],
      },
      { name: "dialect", type: "select", label: { en: "Arabic dialect", ar: "اللهجة العربية" }, options: dialects },
      { name: "message", type: "textarea", label: { en: "Key message / USP", ar: "الرسالة الرئيسية / الميزة التنافسية" } },
    ],
  },
  {
    key: "creative",
    slug: "creative-director",
    systemPrompt:
      "You are an award-winning creative director. Generate distinct campaign concepts with big idea, visual direction, key visuals, shot lists and format adaptations.",
    fields: [
      { name: "campaign", type: "text", required: true, label: { en: "Campaign / brand", ar: "الحملة / العلامة" } },
      { name: "personality", type: "textarea", label: { en: "Brand personality", ar: "شخصية العلامة" } },
      {
        name: "format",
        type: "select",
        required: true,
        label: { en: "Primary format", ar: "الصيغة الرئيسية" },
        options: [
          { value: "static", label: { en: "Static visuals", ar: "تصاميم ثابتة" } },
          { value: "video", label: { en: "Short-form video", ar: "فيديو قصير" } },
          { value: "carousel", label: { en: "Carousel", ar: "منشور متعدد الصور" } },
          { value: "ugc", label: { en: "UGC / creator content", ar: "محتوى صنّاع المحتوى" } },
        ],
      },
      { name: "occasion", type: "text", label: { en: "Season / occasion", ar: "الموسم / المناسبة" }, placeholder: { en: "e.g. Ramadan, White Friday, National Day", ar: "مثال: رمضان، الجمعة البيضاء، اليوم الوطني" } },
      { name: "references", type: "textarea", label: { en: "References & constraints", ar: "مراجع وقيود" } },
    ],
  },
  {
    key: "mediaBuying",
    slug: "media-buying-assistant",
    systemPrompt:
      "You are a senior performance media buyer. Recommend budget allocation, campaign structure, audiences, bidding and an optimisation checklist. Flag assumptions clearly.",
    fields: [
      {
        name: "objective",
        type: "select",
        required: true,
        label: { en: "Campaign objective", ar: "هدف الحملة" },
        options: [
          { value: "sales", label: { en: "Sales / purchases", ar: "المبيعات" } },
          { value: "leads", label: { en: "Leads", ar: "العملاء المحتملون" } },
          { value: "traffic", label: { en: "Traffic", ar: "الزيارات" } },
          { value: "awareness", label: { en: "Reach & awareness", ar: "الوصول والوعي" } },
        ],
      },
      { name: "platforms", type: "text", label: { en: "Platforms", ar: "المنصات" }, placeholder: { en: "Meta, TikTok, Google…", ar: "ميتا، تيك توك، جوجل…" } },
      { name: "budget", type: "text", required: true, label: { en: "Monthly budget", ar: "الميزانية الشهرية" } },
      {
        name: "currency",
        type: "select",
        label: { en: "Currency", ar: "العملة" },
        options: [
          { value: "EGP", label: { en: "EGP", ar: "جنيه مصري" } },
          { value: "SAR", label: { en: "SAR", ar: "ريال سعودي" } },
          { value: "AED", label: { en: "AED", ar: "درهم إماراتي" } },
          { value: "USD", label: { en: "USD", ar: "دولار أمريكي" } },
        ],
      },
      { name: "metrics", type: "textarea", label: { en: "Current performance (optional)", ar: "الأداء الحالي (اختياري)" }, placeholder: { en: "CPM, CTR, CPA, ROAS…", ar: "CPM، CTR، CPA، ROAS…" } },
    ],
  },
  {
    key: "contentPlanner",
    slug: "content-planner",
    systemPrompt:
      "You are a social media content strategist for MENA. Build a content calendar with pillars, formats, captions outlines and regional occasions.",
    fields: [
      { name: "brand", type: "text", required: true, label: { en: "Brand", ar: "العلامة" } },
      { name: "platforms", type: "text", required: true, label: { en: "Platforms", ar: "المنصات" } },
      { name: "month", type: "text", label: { en: "Month", ar: "الشهر" } },
      {
        name: "frequency",
        type: "select",
        label: { en: "Posts per week", ar: "عدد المنشورات أسبوعيًا" },
        options: ["3", "5", "7", "10"].map((v) => ({ value: v, label: { en: v, ar: v } })),
      },
      { name: "pillars", type: "textarea", label: { en: "Content pillars / themes", ar: "محاور المحتوى" } },
    ],
  },
  {
    key: "competitor",
    slug: "competitor-research",
    systemPrompt:
      "You are a market research analyst. Structure a competitor analysis comparing positioning, messaging, offers, channels and opportunities. Only use information the user provides or clearly mark assumptions.",
    fields: [
      { name: "brand", type: "text", required: true, label: { en: "Your brand", ar: "علامتك" } },
      { name: "competitors", type: "textarea", required: true, label: { en: "Competitors (names / URLs)", ar: "المنافسون (الأسماء / الروابط)" } },
      { name: "market", type: "select", label: { en: "Market", ar: "السوق" }, options: markets },
      { name: "focus", type: "textarea", label: { en: "What do you want to learn?", ar: "ماذا تريد أن تعرف؟" } },
    ],
  },
  {
    key: "landingPage",
    slug: "landing-page-builder",
    systemPrompt:
      "You are a conversion copywriter and UX strategist. Produce a landing page outline with section-by-section copy, objection handling and CTAs.",
    fields: [
      { name: "offer", type: "text", required: true, label: { en: "Offer / product", ar: "العرض / المنتج" } },
      audience,
      { name: "cta", type: "text", label: { en: "Primary call to action", ar: "الدعوة الرئيسية لاتخاذ إجراء" } },
      { name: "objections", type: "textarea", label: { en: "Common objections", ar: "الاعتراضات الشائعة" } },
      { name: "dialect", type: "select", label: { en: "Arabic dialect", ar: "اللهجة العربية" }, options: dialects },
    ],
  },
];

export const getToolBySlug = (slug: string) => aiTools.find((t) => t.slug === slug);
