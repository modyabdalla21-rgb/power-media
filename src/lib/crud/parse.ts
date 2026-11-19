import type { FieldDef } from "@/config/modules";

export type FieldError = "required" | "invalid";
export type ParseResult =
  | { ok: true; values: Record<string, string | number | null> }
  | { ok: false; fieldErrors: Record<string, FieldError> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate FormData against a module's field definitions.
 * Read-only fields are never written; unknown form keys are ignored.
 */
export function parseRecord(fields: readonly FieldDef[], fd: FormData, mode: "create" | "update"): ParseResult {
  const values: Record<string, string | number | null> = {};
  const fieldErrors: Record<string, FieldError> = {};

  for (const f of fields) {
    if (f.readOnly || (mode === "create" && f.hideOnCreate)) continue;
    const raw = String(fd.get(f.column) ?? "").trim();
    if (!raw) {
      if (f.required) fieldErrors[f.column] = "required";
      else values[f.column] = null;
      continue;
    }
    switch (f.type) {
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) fieldErrors[f.column] = "invalid";
        else values[f.column] = n;
        break;
      }
      case "date":
        if (!DATE.test(raw) || Number.isNaN(Date.parse(raw))) fieldErrors[f.column] = "invalid";
        else values[f.column] = raw;
        break;
      case "select":
        if (!f.options?.includes(raw as never)) fieldErrors[f.column] = "invalid";
        else values[f.column] = raw;
        break;
      case "relation":
        if (!UUID.test(raw)) fieldErrors[f.column] = "invalid";
        else values[f.column] = raw;
        break;
      case "email":
        if (!EMAIL.test(raw) || raw.length > 200) fieldErrors[f.column] = "invalid";
        else values[f.column] = raw.toLowerCase();
        break;
      default: {
        const max = f.max ?? (f.type === "textarea" ? 4000 : 200);
        if (raw.length > max) fieldErrors[f.column] = "invalid";
        else values[f.column] = raw;
      }
    }
  }
  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true, values };
}
