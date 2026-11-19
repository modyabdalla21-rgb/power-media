/**
 * Agency dashboard CRUD module definitions.
 *
 * One declarative config drives: list queries, search/filter, table columns,
 * create/edit forms, server-side validation and role checks. The database
 * enforces the same rules with Row Level Security (supabase/migrations).
 */
import type { Dictionary } from "@/i18n/dictionaries/en";

export type Role = "admin" | "team" | "client";
export type FieldLabel = keyof Dictionary["dashboard"]["fields"];
export type OptionKey = keyof Dictionary["dashboard"]["options"];
export type RelationSource = "clients" | "projects" | "staff" | "clientUsers";

export type FieldDef = {
  column: string;
  label: FieldLabel;
  type: "text" | "email" | "tel" | "textarea" | "number" | "date" | "select" | "relation";
  required?: boolean;
  options?: readonly OptionKey[];
  relation?: RelationSource;
  min?: number;
  max?: number;
  defaultValue?: string;
  /** Shown in the edit form but never written by the dashboard. */
  readOnly?: boolean;
  /** Hidden in the create form (e.g. auto-generated invoice number). */
  hideOnCreate?: boolean;
  wide?: boolean;
};

export type ColumnDef =
  | { kind: "text"; column: string; label: FieldLabel; strong?: boolean; secondary?: string }
  | { kind: "option"; column: string; label: FieldLabel }
  | { kind: "badge"; column: string; label: FieldLabel }
  | { kind: "money"; column: string; currencyColumn: string; label: FieldLabel }
  | { kind: "date"; column: string; label: FieldLabel }
  | { kind: "dateRange"; column: string; endColumn: string; label: FieldLabel }
  | { kind: "relation"; path: string; label: FieldLabel }
  | { kind: "progress"; column: string; label: FieldLabel };

export type ModuleDef = {
  key: ModuleKey;
  table: string;
  select: string;
  search: readonly string[];
  filter: { column: string; options: readonly OptionKey[] };
  order: { column: string; ascending: boolean };
  fields: readonly FieldDef[];
  columns: readonly ColumnDef[];
  roles: { view: readonly Role[]; create: readonly Role[]; update: readonly Role[]; delete: readonly Role[] };
};

export const STAFF: readonly Role[] = ["admin", "team"];
export const ALL: readonly Role[] = ["admin", "team", "client"];
const ADMIN: readonly Role[] = ["admin"];

const currencies = ["EGP", "SAR", "AED", "USD"] as const satisfies readonly OptionKey[];
const markets = ["egypt", "ksa", "uae", "gcc", "other"] as const satisfies readonly OptionKey[];

export type ModuleKey = "clients" | "projects" | "campaigns" | "tasks" | "reports" | "invoices" | "leads";

export const modules: Record<ModuleKey, ModuleDef> = {
  clients: {
    key: "clients",
    table: "clients",
    select: "*, owner:profiles!clients_owner_id_fkey(full_name, email), portal:profiles!clients_portal_user_id_fkey(full_name, email)",
    search: ["name", "industry", "contact_name", "contact_email"],
    filter: { column: "status", options: ["lead", "active", "paused", "churned"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "name", label: "name", type: "text", required: true, max: 160 },
      { column: "industry", label: "industry", type: "text", max: 120 },
      { column: "market", label: "market", type: "select", options: markets },
      { column: "status", label: "status", type: "select", required: true, options: ["lead", "active", "paused", "churned"], defaultValue: "active" },
      { column: "contact_name", label: "contactName", type: "text", max: 120 },
      { column: "contact_email", label: "contactEmail", type: "email" },
      { column: "contact_phone", label: "contactPhone", type: "tel", max: 40 },
      { column: "retainer_amount", label: "retainerAmount", type: "number", min: 0 },
      { column: "currency", label: "currency", type: "select", required: true, options: currencies, defaultValue: "USD" },
      { column: "owner_id", label: "owner", type: "relation", relation: "staff" },
      { column: "portal_user_id", label: "portalUser", type: "relation", relation: "clientUsers" },
      { column: "notes", label: "notes", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "name", label: "name", strong: true, secondary: "industry" },
      { kind: "option", column: "market", label: "market" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "money", column: "retainer_amount", currencyColumn: "currency", label: "retainerAmount" },
      { kind: "relation", path: "owner", label: "owner" },
      { kind: "text", column: "contact_email", label: "contactEmail" },
    ],
    roles: { view: STAFF, create: STAFF, update: STAFF, delete: ADMIN },
  },
  projects: {
    key: "projects",
    table: "projects",
    select: "*, client:clients(name), lead:profiles!projects_lead_id_fkey(full_name, email)",
    search: ["name", "description"],
    filter: { column: "status", options: ["active", "on_hold", "completed", "cancelled"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "name", label: "name", type: "text", required: true, max: 160 },
      { column: "client_id", label: "client", type: "relation", relation: "clients", required: true },
      { column: "stage", label: "stage", type: "select", required: true, options: ["discovery", "strategy", "production", "launch", "optimisation", "completed"], defaultValue: "discovery" },
      { column: "status", label: "status", type: "select", required: true, options: ["active", "on_hold", "completed", "cancelled"], defaultValue: "active" },
      { column: "due_date", label: "dueDate", type: "date" },
      { column: "progress", label: "progress", type: "number", min: 0, max: 100, defaultValue: "0" },
      { column: "lead_id", label: "projectLead", type: "relation", relation: "staff" },
      { column: "description", label: "description", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "name", label: "name", strong: true },
      { kind: "relation", path: "client", label: "client" },
      { kind: "option", column: "stage", label: "stage" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "date", column: "due_date", label: "dueDate" },
      { kind: "progress", column: "progress", label: "progress" },
    ],
    roles: { view: ALL, create: STAFF, update: STAFF, delete: STAFF },
  },
  campaigns: {
    key: "campaigns",
    table: "campaigns",
    select: "*, client:clients(name)",
    search: ["name"],
    filter: { column: "status", options: ["draft", "active", "paused", "completed"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "name", label: "name", type: "text", required: true, max: 160 },
      { column: "client_id", label: "client", type: "relation", relation: "clients", required: true },
      { column: "platform", label: "platform", type: "select", required: true, options: ["meta", "google", "tiktok", "snapchat", "youtube", "x", "linkedin", "other"] },
      { column: "objective", label: "objective", type: "select", options: ["awareness", "traffic", "leads", "sales", "app"] },
      { column: "budget", label: "budget", type: "number", min: 0 },
      { column: "currency", label: "currency", type: "select", required: true, options: currencies, defaultValue: "USD" },
      { column: "status", label: "status", type: "select", required: true, options: ["draft", "active", "paused", "completed"], defaultValue: "draft" },
      { column: "starts_on", label: "startsOn", type: "date" },
      { column: "ends_on", label: "endsOn", type: "date" },
    ],
    columns: [
      { kind: "text", column: "name", label: "name", strong: true },
      { kind: "relation", path: "client", label: "client" },
      { kind: "option", column: "platform", label: "platform" },
      { kind: "money", column: "budget", currencyColumn: "currency", label: "budget" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "dateRange", column: "starts_on", endColumn: "ends_on", label: "dates" },
    ],
    roles: { view: ALL, create: STAFF, update: STAFF, delete: STAFF },
  },
  tasks: {
    key: "tasks",
    table: "tasks",
    select: "*, project:projects(name), assignee:profiles!tasks_assignee_id_fkey(full_name, email)",
    search: ["title", "notes"],
    filter: { column: "status", options: ["todo", "in_progress", "review", "done"] },
    order: { column: "due_date", ascending: true },
    fields: [
      { column: "title", label: "title", type: "text", required: true, max: 200 },
      { column: "project_id", label: "project", type: "relation", relation: "projects" },
      { column: "assignee_id", label: "assignee", type: "relation", relation: "staff" },
      { column: "priority", label: "priority", type: "select", required: true, options: ["low", "medium", "high", "urgent"], defaultValue: "medium" },
      { column: "status", label: "status", type: "select", required: true, options: ["todo", "in_progress", "review", "done"], defaultValue: "todo" },
      { column: "due_date", label: "dueDate", type: "date" },
      { column: "notes", label: "notes", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "title", label: "title", strong: true },
      { kind: "relation", path: "project", label: "project" },
      { kind: "relation", path: "assignee", label: "assignee" },
      { kind: "badge", column: "priority", label: "priority" },
      { kind: "date", column: "due_date", label: "dueDate" },
      { kind: "badge", column: "status", label: "status" },
    ],
    roles: { view: STAFF, create: STAFF, update: STAFF, delete: STAFF },
  },
  reports: {
    key: "reports",
    table: "reports",
    select: "*, client:clients(name)",
    search: ["title", "summary"],
    filter: { column: "status", options: ["draft", "published"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "title", label: "title", type: "text", required: true, max: 200 },
      { column: "client_id", label: "client", type: "relation", relation: "clients", required: true },
      { column: "period_start", label: "periodStart", type: "date" },
      { column: "period_end", label: "periodEnd", type: "date" },
      { column: "status", label: "status", type: "select", required: true, options: ["draft", "published"], defaultValue: "draft" },
      { column: "summary", label: "summary", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "title", label: "title", strong: true },
      { kind: "relation", path: "client", label: "client" },
      { kind: "dateRange", column: "period_start", endColumn: "period_end", label: "period" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "date", column: "created_at", label: "createdAt" },
    ],
    roles: { view: ALL, create: STAFF, update: STAFF, delete: STAFF },
  },
  invoices: {
    key: "invoices",
    table: "invoices",
    select: "*, client:clients(name)",
    search: ["number", "notes"],
    filter: { column: "status", options: ["draft", "sent", "paid", "overdue", "void"] },
    order: { column: "issued_on", ascending: false },
    fields: [
      { column: "number", label: "number", type: "text", readOnly: true, hideOnCreate: true },
      { column: "client_id", label: "client", type: "relation", relation: "clients", required: true },
      { column: "amount", label: "amount", type: "number", required: true, min: 0 },
      { column: "currency", label: "currency", type: "select", required: true, options: currencies, defaultValue: "USD" },
      { column: "status", label: "status", type: "select", required: true, options: ["draft", "sent", "paid", "overdue", "void"], defaultValue: "draft" },
      { column: "issued_on", label: "issuedOn", type: "date", required: true },
      { column: "due_on", label: "dueOn", type: "date" },
      { column: "paid_on", label: "paidOn", type: "date" },
      { column: "notes", label: "notes", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "number", label: "number", strong: true },
      { kind: "relation", path: "client", label: "client" },
      { kind: "money", column: "amount", currencyColumn: "currency", label: "amount" },
      { kind: "date", column: "issued_on", label: "issuedOn" },
      { kind: "date", column: "due_on", label: "dueOn" },
      { kind: "badge", column: "status", label: "status" },
    ],
    roles: { view: ["admin", "client"], create: ADMIN, update: ADMIN, delete: ADMIN },
  },
  leads: {
    key: "leads",
    table: "leads",
    select: "*",
    search: ["name", "email", "company", "message"],
    filter: { column: "status", options: ["new", "contacted", "qualified", "won", "lost"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "name", label: "name", type: "text", readOnly: true },
      { column: "email", label: "email", type: "email", readOnly: true },
      { column: "phone", label: "phone", type: "tel", readOnly: true },
      { column: "company", label: "company", type: "text", readOnly: true },
      { column: "country", label: "country", type: "text", readOnly: true },
      { column: "service", label: "service", type: "text", readOnly: true },
      { column: "budget", label: "budget", type: "text", readOnly: true },
      { column: "message", label: "message", type: "textarea", readOnly: true, wide: true },
      { column: "status", label: "status", type: "select", required: true, options: ["new", "contacted", "qualified", "won", "lost"], defaultValue: "new" },
      { column: "notes", label: "notes", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "name", label: "name", strong: true, secondary: "email" },
      { kind: "text", column: "company", label: "company" },
      { kind: "text", column: "service", label: "service" },
      { kind: "text", column: "message", label: "message" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "date", column: "created_at", label: "createdAt" },
    ],
    roles: { view: STAFF, create: [], update: STAFF, delete: ADMIN },
  },
};

export const moduleKeys = Object.keys(modules) as ModuleKey[];

export const can = (role: Role | undefined, allowed: readonly Role[]) => !!role && allowed.includes(role);
