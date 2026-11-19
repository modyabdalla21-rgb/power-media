import type { Dictionary } from "@/i18n/dictionaries/en";

export type Option = { value: string; label: string };
export type CrudStrings = Dictionary["dashboard"]["crud"];

/** Serializable field description passed to client forms. */
export type ClientField = {
  column: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "number" | "date" | "select" | "relation";
  required: boolean;
  options: Option[];
  min?: number;
  max?: number;
  readOnly: boolean;
  hideOnCreate: boolean;
  wide: boolean;
  defaultValue?: string;
};

export type RecordValues = Record<string, string>;
