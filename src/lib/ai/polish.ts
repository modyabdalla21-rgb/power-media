/**
 * Output polish for AI results:
 * - Arabic / Egyptian outputs get Arabic section headings, table columns and
 *   field labels (the prompts describe structure in English, and models often
 *   echo those names verbatim).
 * - Square-bracket placeholders such as "[add price]" never reach the user;
 *   they become short, natural notes in the output language.
 *
 * Pure string functions — safe on server and client.
 */

export type OutputDialect = "en" | "ar" | "eg";

/** Maps a tool language value (en, ar_msa, ar_eg, ar_gulf) to a dialect. */
export const outputDialect = (lang: string | null | undefined): OutputDialect =>
  !lang || !lang.startsWith("ar") ? "en" : lang === "ar_eg" ? "eg" : "ar";

type Term = [ar: string, eg?: string];

/** English structure names used by the prompts and structured renderers → Arabic / Egyptian. */
const GLOSSARY: Record<string, Term> = {
  // Ad & content formats
  variation: ["النسخة", "نسخة"],
  post: ["المنشور", "بوست"],
  script: ["السكريبت", "سكريبت"],
  hook: ["الافتتاحية الجاذبة", "الهوك"],
  "primary text": ["النص الأساسي"],
  headline: ["العنوان الرئيسي", "العنوان"],
  description: ["الوصف"],
  "cta button": ["زر الإجراء", "زرار الأكشن"],
  cta: ["الدعوة لاتخاذ إجراء", "المطلوب من العميل"],
  "call to action": ["الدعوة لاتخاذ إجراء", "المطلوب من العميل"],
  "creative direction": ["التوجيه الإبداعي", "فكرة الكرييتف"],
  "script beats": ["مراحل السكريبت"],
  "ad text": ["نص الإعلان"],
  sound: ["الصوت", "الصوت والمزيكا"],
  headlines: ["العناوين"],
  descriptions: ["الأوصاف"],
  sitelinks: ["روابط الموقع الإضافية", "لينكات إضافية"],
  "keyword themes": ["مجموعات الكلمات المفتاحية", "مجموعات الكلمات المفتاحية"],
  "negative keywords": ["الكلمات المستبعدة", "كلمات نستبعدها"],
  caption: ["الكابشن"],
  hashtags: ["الهاشتاجات"],
  "visual direction": ["التوجيه البصري", "شكل الصورة والفيديو"],
  "suggested format": ["الصيغة المقترحة", "الفورمات المقترح"],
  "title / concept": ["العنوان / الفكرة"],
  concept: ["الفكرة"],
  "production notes": ["ملاحظات الإنتاج", "ملاحظات التصوير"],
  "concept & angle": ["الفكرة والزاوية"],
  "shooting checklist": ["قائمة تجهيزات التصوير", "تشيك ليست التصوير"],
  "editing notes": ["ملاحظات المونتاج"],
  time: ["الوقت"],
  visual: ["المشهد"],
  "voiceover / dialogue": ["التعليق الصوتي / الحوار", "الفويس أوفر / الحوار"],
  "voiceover or dialogue": ["التعليق الصوتي / الحوار", "الفويس أوفر / الحوار"],
  voiceover: ["التعليق الصوتي", "الفويس أوفر"],
  "on-screen text": ["النص على الشاشة", "الكلام المكتوب على الشاشة"],
  "scene / visual": ["المشهد / الصورة"],
  "shot / visual": ["اللقطة / المشهد", "اللقطة"],
  shot: ["اللقطة"],
  "spoken script": ["النص المنطوق", "الكلام اللي هيتقال"],
  "content pillars": ["محاور المحتوى"],
  "7-day calendar": ["تقويم المحتوى لـ 7 أيام", "جدول المحتوى لـ 7 أيام"],
  day: ["اليوم"],
  pillar: ["المحور"],
  format: ["الصيغة", "الفورمات"],
  "content outline": ["ملخص المحتوى", "فكرة المحتوى"],
  "best time to post": ["أفضل وقت للنشر", "أحسن وقت للنشر"],
  "best time": ["أفضل وقت للنشر", "أحسن وقت للنشر"],
  "production batch plan": ["خطة الإنتاج المجمّع", "خطة التصوير على دفعة واحدة"],
  "reels scripts": ["سكريبتات الريلز"],
  notes: ["ملاحظات"],
  // Media planner
  summary: ["الملخص"],
  "campaign structure": ["هيكل الحملات", "تقسيم الحملات"],
  platform: ["المنصة"],
  campaign: ["الحملة"],
  "objective / optimisation event": ["الهدف / حدث التحسين", "الهدف / حدث التحسين"],
  objective: ["الهدف"],
  "ad sets or ad groups": ["مجموعات الإعلانات"],
  "ad sets": ["مجموعات الإعلانات"],
  targeting: ["الاستهداف"],
  placements: ["أماكن الظهور"],
  "audience angles": ["زوايا الجمهور", "زوايا نكلم بيها الجمهور"],
  "budget & channel allocation": ["توزيع الميزانية والقنوات", "توزيع الميزانية على القنوات"],
  channel: ["القناة"],
  "share %": ["النسبة %"],
  share: ["النسبة"],
  amount: ["المبلغ"],
  rationale: ["السبب"],
  total: ["الإجمالي"],
  "kpis & targets": ["مؤشرات الأداء والمستهدفات", "مؤشرات الأداء والتارجت"],
  "testing plan": ["خطة الاختبار", "خطة التيست"],
  "tracking checklist": ["قائمة التتبع", "تشيك ليست التتبع"],
  "risks & assumptions": ["المخاطر والافتراضات"],
  // Offer & competitor angles
  "positioning snapshot": ["لمحة عن التموضع", "إحنا فين في السوق"],
  "competitor comparison": ["مقارنة المنافسين", "مقارنة بالمنافسين"],
  competitor: ["المنافس"],
  price: ["السعر"],
  offer: ["العرض"],
  "weakness to exploit": ["نقطة ضعف يمكن استغلالها", "نقطة ضعف نلعب عليها"],
  weakness: ["نقطة الضعف"],
  "offer angles": ["زوايا العرض"],
  "irresistible offer structures": ["هياكل عروض لا تُقاوَم", "عروض محدش يقدر يرفضها"],
  "offer structures": ["هياكل العروض", "شكل العروض"],
  "objection handlers": ["الرد على الاعتراضات", "الرد على اعتراضات العميل"],
  objection: ["الاعتراض"],
  response: ["الرد"],
  "proof to show": ["الدليل المناسب", "الدليل اللي نوريه"],
  proof: ["الدليل"],
  "ad hooks": ["افتتاحيات إعلانية جاذبة", "هوكات إعلانية"],
  hooks: ["الافتتاحيات الجاذبة", "الهوكات"],
  "pricing psychology tips": ["نصائح سيكولوجية التسعير", "تكتيكات تسعير بتقنع"],
  name: ["الاسم"],
  angle: ["الزاوية"],
  "example headline": ["مثال للعنوان", "مثال عنوان"],
  "why it works": ["لماذا ينجح", "ليه بينجح"],
  "best channel": ["أفضل قناة", "أنسب قناة"],
  "best channel/format": ["أفضل قناة / صيغة", "أنسب قناة / فورمات"],
  "what's included": ["ما يشمله العرض", "العرض فيه إيه"],
  "price framing": ["طريقة عرض السعر", "إزاي نعرض السعر"],
  "risk reversal": ["إزالة المخاطرة", "ضمان يطمّن العميل"],
  urgency: ["الإلحاح", "الاستعجال"],
  // Reports
  "executive summary": ["الملخص التنفيذي"],
  "scope & period": ["النطاق والفترة"],
  "work delivered": ["الأعمال المنفّذة", "الشغل اللي اتعمل"],
  results: ["النتائج"],
  metric: ["المؤشر"],
  value: ["القيمة"],
  interpretation: ["التفسير", "يعني إيه"],
  insights: ["الاستنتاجات", "إيه اللي اتعلمناه"],
  "next steps & recommendations": ["الخطوات التالية والتوصيات", "الخطوات الجاية والتوصيات"],
  "data sources": ["مصادر البيانات"],
  // Structured renderers (analysis, plans, diagnosis, identity)
  "brand analysis": ["تحليل العلامة", "تحليل البراند"],
  strengths: ["نقاط القوة"],
  gaps: ["الفجوات", "النواقص"],
  "next steps": ["الخطوات التالية", "الخطوات الجاية"],
  bottleneck: ["العائق الرئيسي", "اللي واقف قدامك"],
  roadmap: ["خارطة الطريق", "خطة الطريق"],
  goal: ["الهدف"],
  tasks: ["المهام"],
  task: ["المهمة"],
  category: ["الفئة", "النوع"],
  priority: ["الأولوية"],
  "due (days)": ["الموعد (بالأيام)", "المعاد (بالأيام)"],
  positioning: ["التموضع"],
  personality: ["الشخصية"],
  palette: ["لوحة الألوان", "الألوان"],
  hex: ["كود اللون"],
  role: ["الدور"],
  usage: ["الاستخدام"],
  typography: ["الخطوط"],
  headings: ["العناوين"],
  body: ["النصوص", "الكلام"],
  arabic: ["العربي"],
  voice: ["نبرة الصوت", "أسلوب الكلام"],
  "logo concepts": ["أفكار الشعار", "أفكار اللوجو"],
  prompt: ["وصف التوليد", "البرومبت"],
};

/** Enum values used inside structured outputs. */
const ENUMS: Record<string, Term> = {
  high: ["عالية"],
  medium: ["متوسطة"],
  low: ["منخفضة", "قليلة"],
  quick: ["سريعة"],
  big: ["كبيرة"],
  foundation: ["التأسيس"],
  launch: ["الإطلاق"],
  growth: ["النمو"],
  scale: ["التوسّع"],
  content: ["محتوى"],
  video: ["فيديو"],
  ads: ["إعلانات"],
  social: ["سوشيال ميديا", "سوشيال"],
  brand: ["الهوية", "البراند"],
  website: ["الموقع"],
  research: ["بحث"],
  other: ["أخرى", "تاني"],
  primary: ["أساسي"],
  secondary: ["ثانوي"],
  accent: ["مميّز", "لون مميّز"],
  neutral: ["محايد"],
  background: ["الخلفية"],
};

const pick = (t: Term, d: OutputDialect) => (d === "eg" ? (t[1] ?? t[0]) : t[0]);
const ARABIC = /[؀-ۿ]/;
const KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KEY_RE = new RegExp(`(^|[^A-Za-z])(${KEYS.map(escape).join("|")})(?=$|[^A-Za-z])`, "gi");

/** Translates an enum value (priority, stage, category, palette role…) for display. */
export function enumLabel(value: string, d: OutputDialect) {
  const t = d === "en" ? undefined : ENUMS[value.toLowerCase()];
  return t ? pick(t, d) : value;
}

/** Exact label lookup ("Primary text", "Format (Reel / Carousel)", "Goal:"). */
function translateLabel(label: string, d: OutputDialect): string {
  const m = /^(\s*)(.*?)(\s*)(:?)(\s*)$/.exec(label);
  if (!m) return label;
  const [, lead, core, , colon, trail] = m;
  const paren = /^(.*?)\s*(\([^)]*\))$/.exec(core);
  const base = (paren ? paren[1] : core).trim();
  const hit = GLOSSARY[base.toLowerCase()];
  if (!hit) return label;
  const note = paren ? paren[2].replace(/(\d)\s?s\b/g, "$1 ث") : "";
  return `${lead}${pick(hit, d)}${note ? ` ${note}` : ""}${colon}${trail}`;
}

/** Replaces structure words inside a short Latin-only label ("Variation 2", "Roadmap"). */
function translatePhrase(phrase: string, d: OutputDialect): string {
  if (ARABIC.test(phrase) || !/[A-Za-z]/.test(phrase)) return phrase;
  const exact = translateLabel(phrase, d);
  if (exact !== phrase) return exact;
  const out = phrase.replace(KEY_RE, (_, pre: string, word: string) => `${pre}${pick(GLOSSARY[word.toLowerCase()], d)}`);
  // Only accept when nothing English is left (otherwise it's probably a brand / product name).
  return /[A-Za-z]{3,}/.test(out.replace(/\b(CTA|KPI|ROAS|CPA|CPM|CTR|UGC|Reels?|TikTok|Meta|Google|Snapchat|Instagram|Facebook|WhatsApp|GA4|UTM)s?\b/g, "")) ? phrase : out;
}

function localizeLine(line: string, d: OutputDialect, inHeaderRow: boolean): string {
  // Markdown headings: translate the label part before " — ", " - " or ":".
  const h = /^(#{1,6}\s+)(.*)$/.exec(line);
  if (h) {
    const [, hashes, rest] = h;
    const split = /^(.*?)(\s+[—–-]\s+|:\s*)(.*)$/.exec(rest);
    if (split) return `${hashes}${translatePhrase(split[1], d)}${split[2]}${split[3]}`;
    return `${hashes}${translatePhrase(rest, d)}`;
  }
  // Table header row: translate each cell.
  if (inHeaderRow) {
    return line.replace(/(\|)([^|]+)(?=\|)/g, (_, bar: string, cell: string) => `${bar}${cell.trim() ? ` ${translatePhrase(cell.trim(), d)} ` : cell}`);
  }
  // Bold / italic field labels at the start of a line or list item: "**Hook (0–3s)**:", "- **Goal:**", "*Prompt:*".
  return line.replace(/^(\s*(?:[-*+]|\d+[.)])?\s*)(\*\*|\*)([^*]{1,60}?)\2/, (all, lead: string, mark: string, label: string) => {
    const t = translateLabel(label, d);
    return t === label ? all : `${lead}${mark}${t}${mark}`;
  });
}

/** Arabic headings / columns / labels for Arabic & Egyptian outputs. */
export function localizeStructure(text: string, d: OutputDialect): string {
  if (d === "en") return text;
  const lines = text.split("\n");
  let fence = false;
  return lines
    .map((line, i) => {
      if (/^\s*```/.test(line)) fence = !fence;
      if (fence) return line;
      const headerRow = /^\s*\|/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? "") && !/^\s*\|?\s*:?-{2,}/.test(line);
      return localizeLine(line, d, headerRow);
    })
    .join("\n");
}

const NOTES: Record<string, Record<OutputDialect, string>> = {
  missing: { en: "not provided", ar: "غير متوفر", eg: "مش متوفر" },
  price: { en: "add your price", ar: "أضف السعر الفعلي", eg: "حط السعر الحقيقي" },
  phone: { en: "add your number", ar: "أضف رقم التواصل", eg: "حط رقم التواصل" },
  link: { en: "add your link", ar: "أضف الرابط", eg: "حط اللينك" },
  date: { en: "add the date", ar: "أضف التاريخ", eg: "حط التاريخ" },
  address: { en: "add your address", ar: "أضف العنوان", eg: "حط العنوان" },
  discount: { en: "add the discount", ar: "أضف قيمة الخصم", eg: "حط قيمة الخصم" },
  name: { en: "add the name", ar: "أضف الاسم", eg: "حط الاسم" },
  proof: { en: "add a real review or result", ar: "أضف تقييمًا أو نتيجة حقيقية", eg: "حط ريفيو أو نتيجة حقيقية" },
  number: { en: "add the real number", ar: "أضف الرقم الفعلي", eg: "حط الرقم الحقيقي" },
  generic: { en: "add details", ar: "أضف التفاصيل", eg: "كمّل التفاصيل دي" },
};

function placeholderNote(inner: string, d: OutputDialect): string {
  const s = inner.toLowerCase();
  const key =
    /not provided|n\/a|tbd|unknown|missing|غير متوفر|مش متوفر/.test(s) ? "missing"
    : /price|cost|سعر/.test(s) ? "price"
    : /phone|whats ?app|number to call|mobile|رقم/.test(s) ? "phone"
    : /link|url|website|bio|رابط|لينك/.test(s) ? "link"
    : /date|deadline|تاريخ|معاد|موعد/.test(s) ? "date"
    : /address|location|branch|عنوان|فرع/.test(s) ? "address"
    : /discount|%|off|خصم/.test(s) ? "discount"
    : /testimonial|review|result|proof|rating|تقييم|ريفيو|نتيجة/.test(s) ? "proof"
    : /name|اسم/.test(s) ? "name"
    : /number|metric|figure|stat|amount|رقم|عدد/.test(s) ? "number"
    : "generic";
  return NOTES[key][d];
}

/**
 * Replaces square-bracket placeholders ("[add price]", "[...]", "[metric not
 * provided]") with natural notes. Markdown links, images, footnotes and task
 * checkboxes are left alone; code spans/blocks are untouched.
 */
export function cleanPlaceholders(text: string, d: OutputDialect): string {
  let fence = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) fence = !fence;
      if (fence) return line;
      return line
        .split(/(`[^`]*`)/)
        .map((part, i) => {
          if (i % 2 === 1) return part; // inline code
          return part.replace(/(!?)\[([^\[\]\n]{0,120})\](?!\(|:)/g, (all, bang: string, inner: string, offset: number, whole: string) => {
            if (bang) return all;
            if (/^[ xX]$/.test(inner)) return all; // task list checkbox
            if (/^\^/.test(inner)) return all; // footnote
            if (whole[offset - 1] === "]") return all; // reference link second part
            const trimmed = inner.trim();
            if (!trimmed || /^[.…\s]+$/.test(trimmed)) return `(${NOTES.generic[d]})`;
            // Arabic text already in the output language: keep the words, drop the brackets.
            if (d !== "en" && ARABIC.test(trimmed) && !/[A-Za-z]{3,}/.test(trimmed)) return `(${trimmed})`;
            if (d === "en") return `(${trimmed})`;
            return `(${placeholderNote(trimmed, d)})`;
          });
        })
        .join("");
    })
    .join("\n");
}

/** Full Markdown polish for a tool output. */
export function polishOutput(text: string, lang: string | null | undefined): string {
  const d = outputDialect(lang);
  return localizeStructure(cleanPlaceholders(text, d), d);
}

/** Placeholder clean-up for every string inside structured (JSON) results. */
export function polishData<T>(value: T, lang: string | null | undefined): T {
  const d = outputDialect(lang);
  const walk = (v: unknown): unknown =>
    typeof v === "string" ? cleanPlaceholders(v, d)
    : Array.isArray(v) ? v.map(walk)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "svg" || k === "hex" || k === "logo_prompt" ? x : walk(x)]))
    : v;
  return walk(value) as T;
}

/** Prompt addendum: the exact Arabic names to use for headings, columns and labels. */
export function headingGlossaryPrompt(lang: string | null | undefined, terms: string[]): string {
  const d = outputDialect(lang);
  if (d === "en") return "";
  const pairs = terms
    .map((t) => [t, GLOSSARY[t.toLowerCase()]] as const)
    .filter((p): p is readonly [string, Term] => !!p[1])
    .map(([t, v]) => `"${t}" → "${pick(v, d)}"`);
  return pairs.length
    ? `\nWrite EVERY section heading, table column name and bold field label in Arabic${d === "eg" ? " (Egyptian colloquial)" : ""}. The structure below is described in English for clarity only — never copy the English names. Use these exact names: ${pairs.join("; ")}.`
    : "";
}
