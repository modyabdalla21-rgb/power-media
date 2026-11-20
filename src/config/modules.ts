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
  type: "text" | "email" | "tel" | "textarea" | "number" | "date" | "select" | "relation" | "boolean";
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
  /** Roles that see and edit this field in forms (default: everyone with access). */
  roles?: readonly Role[];
};

type ColumnBase = { label: FieldLabel; /** Roles that see this column (default: all). */ roles?: readonly Role[] };
export type ColumnDef = ColumnBase & (
  | { kind: "text"; column: string; strong?: boolean; secondary?: string; link?: boolean }
  | { kind: "boolean"; column: string }
  | { kind: "option"; column: string }
  | { kind: "badge"; column: string }
  | { kind: "money"; column: string; currencyColumn: string }
  | { kind: "date"; column: string }
  | { kind: "dateRange"; column: string; endColumn: string }
  | { kind: "relation"; path: string }
  | { kind: "progress"; column: string }
);

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
  /** Dashboard path of the list (defaults to /dashboard/<key>). Rows link to `${path}/<id>` when a column has `link`. */
  path?: string;
  /** Clients create records in their own workspace: client_id is set server-side. */
  clientScoped?: boolean;
};

export const STAFF: readonly Role[] = ["admin", "team"];
export const ALL: readonly Role[] = ["admin", "team", "client"];
const ADMIN: readonly Role[] = ["admin"];

const currencies = ["EGP", "SAR", "AED", "USD"] as const satisfies readonly OptionKey[];
const markets = ["egypt", "ksa", "uae", "gcc", "other"] as const satisfies readonly OptionKey[];

export type ModuleKey = "clients" | "projects" | "campaigns" | "tasks" | "reports" | "invoices" | "leads" | "generations" | "requests" | "brandTasks";

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
      { column: "plan_tier", label: "planTier", type: "select", required: true, options: ["free", "growth", "pro"], defaultValue: "free" },
      { column: "owner_id", label: "owner", type: "relation", relation: "staff" },
      { column: "portal_user_id", label: "portalUser", type: "relation", relation: "clientUsers" },
      { column: "audience", label: "audience", type: "textarea", max: 2000 },
      { column: "tone", label: "tone", type: "text", max: 300 },
      { column: "dialect", label: "dialect", type: "select", options: ["en", "ar_msa", "ar_eg", "ar_gulf"] },
      { column: "website", label: "website", type: "text", max: 300 },
      { column: "brand_notes", label: "brandNotes", type: "textarea", wide: true, max: 4000 },
      { column: "notes", label: "notes", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "name", label: "name", strong: true, secondary: "industry" },
      { kind: "option", column: "market", label: "market" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "badge", column: "plan_tier", label: "planTier" },
      { kind: "option", column: "source", label: "source" },
      { kind: "money", column: "retainer_amount", currencyColumn: "currency", label: "retainerAmount" },
      { kind: "relation", path: "owner", label: "owner" },
    ],
    roles: { view: STAFF, create: STAFF, update: STAFF, delete: ADMIN },
  },
  projects: {
    key: "projects",
    table: "projects",
    path: "/dashboard/projects",
    clientScoped: true,
    select: "*, client:clients(name), lead:profiles!projects_lead_id_fkey(full_name, email)",
    search: ["name", "description", "objective", "deliverables", "decision_notes"],
    filter: { column: "status", options: ["active", "on_hold", "completed", "cancelled"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "name", label: "name", type: "text", required: true, max: 160 },
      { column: "client_id", label: "client", type: "relation", relation: "clients", required: true, roles: STAFF },
      { column: "objective", label: "objective", type: "textarea", max: 2000, wide: true },
      { column: "deliverables", label: "deliverables", type: "textarea", max: 4000, wide: true },
      { column: "priority", label: "priority", type: "select", required: true, options: ["low", "medium", "high", "urgent"], defaultValue: "medium" },
      { column: "due_date", label: "dueDate", type: "date" },
      { column: "decision_status", label: "decisionStatus", type: "select", required: true, options: ["pending", "approved", "changes_requested", "on_hold"], defaultValue: "pending" },
      { column: "decision_notes", label: "decisionNotes", type: "textarea", max: 4000, wide: true },
      { column: "stage", label: "stage", type: "select", required: true, options: ["discovery", "strategy", "production", "launch", "optimisation", "completed"], defaultValue: "discovery", roles: STAFF },
      { column: "status", label: "status", type: "select", required: true, options: ["active", "on_hold", "completed", "cancelled"], defaultValue: "active", roles: STAFF },
      { column: "progress", label: "progress", type: "number", min: 0, max: 100, defaultValue: "0", roles: STAFF },
      { column: "lead_id", label: "projectLead", type: "relation", relation: "staff", roles: STAFF },
      { column: "description", label: "description", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "text", column: "name", label: "name", strong: true, link: true, secondary: "objective" },
      { kind: "relation", path: "client", label: "client", roles: STAFF },
      { kind: "badge", column: "priority", label: "priority" },
      { kind: "badge", column: "decision_status", label: "decisionStatus" },
      { kind: "option", column: "stage", label: "stage" },
      { kind: "date", column: "due_date", label: "dueDate" },
      { kind: "progress", column: "progress", label: "progress" },
    ],
    // RLS: staff manage all; clients create/steer projects in their own
    // workspace (agency fields trigger-protected) and delete only their own.
    roles: { view: ALL, create: ALL, update: ALL, delete: ALL },
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
  generations: {
    key: "generations",
    table: "ai_generations",
    path: "/dashboard/ai/history",
    select: "*, client:clients(name), project:projects(name), author:profiles!ai_generations_user_id_fkey(full_name, email)",
    search: ["title", "output"],
    filter: { column: "tool", options: ["adStudio", "mediaPlanner", "reportGenerator", "brandIdentity"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "title", label: "title", type: "text", required: true, max: 200, wide: true },
      { column: "client_id", label: "client", type: "relation", relation: "clients" },
      { column: "project_id", label: "project", type: "relation", relation: "projects" },
      { column: "shared_with_client", label: "sharedWithClient", type: "boolean", defaultValue: "false" },
    ],
    columns: [
      { kind: "text", column: "title", label: "title", strong: true, link: true },
      { kind: "option", column: "tool", label: "tool" },
      { kind: "relation", path: "client", label: "client" },
      { kind: "relation", path: "author", label: "author" },
      { kind: "boolean", column: "shared_with_client", label: "sharedWithClient" },
      { kind: "date", column: "created_at", label: "createdAt" },
    ],
    // RLS: team edits their own, admin any; anyone deletes their own items;
    // clients read their own generations plus items shared with them.
    roles: { view: ALL, create: [], update: STAFF, delete: ALL },
  },
  requests: {
    key: "requests",
    table: "client_requests",
    select: "*, client:clients(name), requester:profiles!client_requests_requested_by_fkey(full_name, email)",
    search: ["message", "notes"],
    filter: { column: "status", options: ["new", "contacted", "done"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "kind", label: "kind", type: "select", options: ["upgrade", "brand_help", "general"], readOnly: true },
      { column: "requested_tier", label: "requestedTier", type: "select", options: ["growth", "pro"], readOnly: true },
      { column: "message", label: "message", type: "textarea", readOnly: true, wide: true },
      { column: "status", label: "status", type: "select", required: true, options: ["new", "contacted", "done"], defaultValue: "new" },
      { column: "notes", label: "notes", type: "textarea", wide: true },
    ],
    columns: [
      { kind: "relation", path: "client", label: "client" },
      { kind: "option", column: "kind", label: "kind" },
      { kind: "option", column: "requested_tier", label: "requestedTier" },
      { kind: "relation", path: "requester", label: "requestedBy" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "date", column: "created_at", label: "createdAt" },
    ],
    // Clients create requests from Plan / Brand pages (server actions).
    roles: { view: STAFF, create: [], update: STAFF, delete: ADMIN },
  },
  brandTasks: {
    key: "brandTasks",
    table: "brand_tasks",
    path: "/dashboard/brand-tasks",
    select: "*, client:clients(name), plan:brand_plans(title)",
    search: ["title", "details"],
    filter: { column: "status", options: ["todo", "in_progress", "done"] },
    order: { column: "created_at", ascending: false },
    fields: [
      { column: "title", label: "title", type: "text", required: true, max: 200, wide: true },
      { column: "details", label: "details", type: "textarea", max: 2000, wide: true },
      { column: "category", label: "category", type: "select", required: true, options: ["content", "video", "ads", "social", "brand", "website", "research", "other"], defaultValue: "other" },
      { column: "priority", label: "priority", type: "select", required: true, options: ["low", "medium", "high"], defaultValue: "medium" },
      { column: "status", label: "status", type: "select", required: true, options: ["todo", "in_progress", "done"], defaultValue: "todo" },
      { column: "due_date", label: "dueDate", type: "date" },
    ],
    columns: [
      { kind: "text", column: "title", label: "title", strong: true, secondary: "details" },
      { kind: "relation", path: "client", label: "client" },
      { kind: "relation", path: "plan", label: "plan" },
      { kind: "option", column: "category", label: "category" },
      { kind: "badge", column: "status", label: "status" },
      { kind: "date", column: "due_date", label: "dueDate" },
    ],
    // Oversight: brands manage their own tasks in the Brand hub.
    roles: { view: STAFF, create: [], update: STAFF, delete: ADMIN },
  },
};

/** Modules served by the generic /dashboard/[module] route. */
export const genericModuleKeys = ["clients", "campaigns", "tasks", "reports", "invoices", "leads", "requests"] as const satisfies readonly ModuleKey[];

/** Form fields visible/editable for a role. */
export const fieldsForRole = (def: ModuleDef, role: Role | undefined) => def.fields.filter((f) => !f.roles || (!!role && f.roles.includes(role)));
export const columnsForRole = (def: ModuleDef, role: Role | undefined) => def.columns.filter((c) => !c.roles || (!!role && c.roles.includes(role)));
export const modulePath = (def: ModuleDef) => def.path ?? `/dashboard/${def.key}`;

export const moduleKeys = Object.keys(modules) as ModuleKey[];

export const can = (role: Role | undefined, allowed: readonly Role[]) => !!role && allowed.includes(role);
