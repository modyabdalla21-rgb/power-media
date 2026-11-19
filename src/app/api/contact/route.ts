import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";
import { createSupabaseServerClient } from "@/lib/supabase/server";


export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 422 });
  }
  const { website: _hp, ...lead } = parsed.data;
  void _hp;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ code: "NOT_CONFIGURED" }, { status: 503 });

  const { error } = await supabase.from("leads").insert({ ...lead, source: "website_contact" });
  if (error) {
    console.error("[contact] insert failed", error.message);
    return NextResponse.json({ code: "ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
