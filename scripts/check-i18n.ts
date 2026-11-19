/**
 * Strict i18n parity check: every English key must exist in Arabic with the
 * same type, arrays must have the same length, strings must be non-empty
 * (unless empty in English too) and {placeholders} must match.
 * Run: npm run i18n:check
 */
import en from "../src/i18n/dictionaries/en.ts";
import ar from "../src/i18n/dictionaries/ar.ts";

const errors: string[] = [];
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

function walk(a: unknown, b: unknown, path: string) {
  if (typeof a === "string") {
    if (typeof b !== "string") return void errors.push(`${path}: expected string`);
    if (a.trim() && !b.trim()) errors.push(`${path}: empty translation`);
    if (placeholders(a) !== placeholders(b)) errors.push(`${path}: placeholders differ (${placeholders(a)} vs ${placeholders(b)})`);
    return;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return void errors.push(`${path}: expected array`);
    if (a.length !== b.length) errors.push(`${path}: length ${a.length} vs ${b.length}`);
    a.forEach((v, i) => walk(v, b[i], `${path}[${i}]`));
    return;
  }
  if (a && typeof a === "object") {
    if (!b || typeof b !== "object") return void errors.push(`${path}: expected object`);
    const ka = Object.keys(a), kb = Object.keys(b as object);
    for (const k of ka) if (!(k in (b as object))) errors.push(`${path}.${k}: missing in ar`);
    for (const k of kb) if (!(k in (a as object))) errors.push(`${path}.${k}: extra key in ar`);
    for (const k of ka) if (k in (b as object)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
  }
}

walk(en, ar, "dict");
if (errors.length) {
  console.error(`✗ i18n check failed (${errors.length}):\n` + errors.map((e) => "  " + e).join("\n"));
  process.exit(1);
}
console.log("✓ i18n: English and Arabic dictionaries are in full parity.");
