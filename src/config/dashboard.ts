import {
  BarChart3, Briefcase, FileText, FolderKanban, Inbox, Library, LifeBuoy, ListChecks, Megaphone, type LucideIcon,
} from "lucide-react";
import { ALL, STAFF, genericModuleKeys, modulePath, modules, type ModuleKey, type Role } from "@/config/modules";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type DashboardNavKey = keyof Dictionary["dashboard"]["nav"];

export const moduleIcons: Record<ModuleKey, LucideIcon> = {
  clients: Briefcase,
  projects: FolderKanban,
  campaigns: Megaphone,
  tasks: ListChecks,
  reports: BarChart3,
  invoices: FileText,
  leads: Inbox,
  generations: Library,
  requests: LifeBuoy,
  brandTasks: ListChecks,
};

/** `agencyPortal`: agency-run work views (never in the client menu). */
type NavItem = { key: DashboardNavKey; href: string; roles: readonly Role[]; agencyPortal?: boolean };

/** Modules that only make sense when the agency runs the account. */
export const AGENCY_PORTAL_MODULES = ["projects", "campaigns", "reports", "invoices"] as const;

const ADMIN: readonly Role[] = ["admin"];
const CLIENT: readonly Role[] = ["client"];
const mod = (key: (typeof genericModuleKeys)[number] | "projects"): NavItem => ({ key, href: modulePath(modules[key]), roles: modules[key].roles.view, agencyPortal: (AGENCY_PORTAL_MODULES as readonly string[]).includes(key) });

/** Sidebar navigation. Items are filtered by the signed-in user's role. */
export const dashboardNav: NavGroup[] = [
  {
    group: "workspace",
    items: [
      { key: "brand", href: "/dashboard/brand", roles: CLIENT },
      { key: "growth", href: "/dashboard/growth", roles: CLIENT },
      { key: "plan", href: "/dashboard/plan", roles: CLIENT },
    ],
  },
  {
    group: "agency",
    items: [
      { key: "overview", href: "/dashboard", roles: STAFF },
      mod("leads"),
      mod("requests"),
      { key: "brandTasks", href: "/dashboard/brand-tasks", roles: STAFF },
      mod("clients"),
      mod("projects"),
      mod("campaigns"),
      mod("tasks"),
      mod("reports"),
      { key: "team", href: "/dashboard/team", roles: ADMIN },
      { key: "revenue", href: "/dashboard/revenue", roles: ADMIN },
      mod("invoices"),
    ],
  },
  {
    group: "ai",
    items: [
      { key: "aiHub", href: "/dashboard/ai", roles: ALL },
      // Clients see documents the agency shared with them.
      { key: "aiLibrary", href: "/dashboard/ai/history", roles: ALL },
    ],
  },
  { group: "system", items: [{ key: "settings", href: "/dashboard/settings", roles: ALL }] },
];

type NavGroup = { group: keyof Dictionary["dashboard"]["groups"]; items: NavItem[] };

/**
 * Client menu: an AI brand-growth workspace. Agency-run views (projects,
 * campaigns, reports, invoices) are never part of it.
 */
const clientNav: NavGroup[] = [
  {
    group: "workspace",
    items: [
      { key: "brand", href: "/dashboard/brand", roles: CLIENT },
      { key: "growth", href: "/dashboard/growth", roles: CLIENT },
      { key: "growthTasks", href: "/dashboard/brand#tasks", roles: CLIENT },
      { key: "brandKit", href: "/dashboard/brand#identity", roles: CLIENT },
    ],
  },
  {
    group: "strategy",
    items: [
      { key: "strategyTool", href: "/dashboard/ai/marketing-strategy", roles: CLIENT },
      { key: "metaTool", href: "/dashboard/ai/meta-ads-strategy", roles: CLIENT },
      { key: "offerTool", href: "/dashboard/ai/offer-angles", roles: CLIENT },
    ],
  },
  {
    group: "create",
    items: [
      { key: "postTool", href: "/dashboard/ai/static-post-studio", roles: CLIENT },
      { key: "contentStudio", href: "/dashboard/ai/ad-copy-studio", roles: CLIENT },
      { key: "identityTool", href: "/dashboard/ai/brand-identity", roles: CLIENT },
    ],
  },
  {
    group: "account",
    items: [
      { key: "aiLibrary", href: "/dashboard/ai/history", roles: CLIENT },
      { key: "allTools", href: "/dashboard/ai", roles: CLIENT },
      { key: "plan", href: "/dashboard/plan", roles: CLIENT },
      { key: "settings", href: "/dashboard/settings", roles: CLIENT },
    ],
  },
];

/** Serializable menu for a role, built on the server and passed to the (client) sidebar. */
export type NavGroupData = { group: NavGroup["group"]; items: { key: DashboardNavKey; href: string }[] };

export function navForRole(role: Role | undefined): NavGroupData[] {
  const groups = role === "client" ? clientNav : dashboardNav.map((g) => ({ ...g, items: g.items.filter((i) => !!role && i.roles.includes(role)) }));
  return groups.filter((g) => g.items.length > 0).map((g) => ({ group: g.group, items: g.items.map(({ key, href }) => ({ key, href })) }));
}
