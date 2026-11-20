"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";
import { BRAND_BUCKET, getClientWorkspace } from "./workspace";

const MIME = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"] as const;
const HEX = /^#[0-9a-f]{6}$/i;

const assetInput = z.object({
  path: z.string().max(300),
  kind: z.enum(["logo", "product"]),
  fileName: z.string().trim().max(200).optional().default(""),
  mime: z.enum(MIME),
  size: z.number().int().min(1).max(5 * 1024 * 1024),
  caption: z.string().trim().max(300).optional().default(""),
  kitName: z.string().trim().max(160).optional().default(""),
});

export type AssetResult = { ok: true; id: string } | { ok: false; error: "invalid" | "forbidden" | "dbError" };

/**
 * Register a file the client just uploaded to Storage (under their own
 * workspace folder). Logos become the active brand kit's logo — a kit is
 * created from the upload if the client has none yet.
 */
export async function registerBrandAsset(input: z.input<typeof assetInput>): Promise<AssetResult> {
  const supabase = await createSupabaseServerClient();
  const workspace = await getClientWorkspace();
  if (!supabase || !workspace) return { ok: false, error: "forbidden" };
  const parsed = assetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const a = parsed.data;
  // Only files inside this client's folder: "<client_id>/<file>" with no traversal.
  if (!new RegExp(`^${workspace.id}/[A-Za-z0-9._-]{1,120}$`).test(a.path)) return { ok: false, error: "invalid" };

  const { data: asset, error } = await supabase
    .from("brand_assets")
    .insert({ client_id: workspace.id, kind: a.kind, storage_path: a.path, file_name: a.fileName || null, mime_type: a.mime, size_bytes: a.size, caption: a.caption || null })
    .select("id")
    .single();
  if (error || !asset) {
    console.error("[assets] register failed", error?.code, error?.message);
    return { ok: false, error: error?.code === "42501" ? "forbidden" : "dbError" };
  }

  if (a.kind === "logo") {
    const { data: active } = await supabase.from("brand_kits").select("id").eq("client_id", workspace.id).eq("is_active", true).maybeSingle();
    if (active) {
      await supabase.from("brand_kits").update({ logo_asset_id: asset.id }).eq("id", active.id);
    } else {
      const { data: kit } = await supabase
        .from("brand_kits")
        .insert({ client_id: workspace.id, name: a.kitName || workspace.name, source: "existing", logo_asset_id: asset.id })
        .select("id")
        .single();
      if (kit) await supabase.rpc("activate_brand_kit", { kit: kit.id });
    }
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true, id: asset.id };
}

export type SimpleState = { ok?: boolean; error?: "invalid" | "forbidden" | "dbError" } | undefined;

/** Remove an asset row and its stored file. */
export async function deleteBrandAsset(_prev: SimpleState, fd: FormData): Promise<SimpleState> {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  const id = z.uuid().safeParse(fd.get("asset_id"));
  if (!supabase || !profile || !id.success) return { error: "invalid" };
  const { data: asset } = await supabase.from("brand_assets").select("id, storage_path").eq("id", id.data).maybeSingle();
  if (!asset) return { error: "forbidden" };
  const { error } = await supabase.from("brand_assets").delete().eq("id", asset.id);
  if (error) return { error: "dbError" };
  const { error: storageError } = await supabase.storage.from(BRAND_BUCKET).remove([asset.storage_path]);
  if (storageError) console.error("[assets] file remove failed", storageError.message);
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/** Use colors detected in an uploaded logo as the active kit's palette. */
export async function applyKitColors(colors: string[], kitName?: string): Promise<SimpleState> {
  const supabase = await createSupabaseServerClient();
  const workspace = await getClientWorkspace();
  if (!supabase || !workspace) return { error: "forbidden" };
  const valid = [...new Set(colors.filter((c) => HEX.test(c)).map((c) => c.toUpperCase()))].slice(0, 6);
  if (valid.length < 1) return { error: "invalid" };
  const roles = ["primary", "secondary", "accent", "neutral", "background", "accent"];
  const palette = valid.map((hex, i) => ({ name: roles[i], hex, role: roles[i] }));

  const { data: active } = await supabase.from("brand_kits").select("id").eq("client_id", workspace.id).eq("is_active", true).maybeSingle();
  if (active) {
    const { error } = await supabase.from("brand_kits").update({ palette }).eq("id", active.id);
    if (error) return { error: "dbError" };
  } else {
    const { data: kit, error } = await supabase
      .from("brand_kits")
      .insert({ client_id: workspace.id, name: kitName || workspace.name, source: "existing", palette })
      .select("id")
      .single();
    if (error || !kit) return { error: "dbError" };
    await supabase.rpc("activate_brand_kit", { kit: kit.id });
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
