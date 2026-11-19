import {
  BarChart3, Bot, Briefcase, CreditCard, LifeBuoy, Library, Palette, FileText, FolderKanban, Inbox, LayoutDashboard, ListChecks, Megaphone,
  Settings, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import { ALL, STAFF, genericModuleKeys, modules, type ModuleKey, type Role } from "@/config/modules";
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
};

type NavItem = { key: DashboardNavKey; href: string; icon: LucideIcon; roles: readonly Role[] };

const ADMIN: readonly Role[] = ["admin"];
const CLIENT: readonly Role[] = ["client"];
const mod = (key: (typeof genericModuleKeys)[number]): NavItem => ({ key, href: `/dashboard/${key}`, icon: moduleIcons[key], roles: modules[key].roles.view });

/** Sidebar navigation. Items are filtered by the signed-in user's role. */
export const dashboardNav: { group: keyof Dictionary["dashboard"]["groups"]; items: NavItem[] }[] = [
  {
    group: "workspace",
    items: [
      { key: "overview", href: "/dashboard", icon: LayoutDashboard, roles: CLIENT },
      { key: "brand", href: "/dashboard/brand", icon: Palette, roles: CLIENT },
      { key: "plan", href: "/dashboard/plan", icon: CreditCard, roles: CLIENT },
    ],
  },
  {
    group: "agency",
    items: [
      { key: "overview", href: "/dashboard", icon: LayoutDashboard, roles: STAFF },
      mod("leads"),
      mod("requests"),
      mod("clients"),
      mod("projects"),
      mod("campaigns"),
      mod("tasks"),
      mod("reports"),
      { key: "team", href: "/dashboard/team", icon: UsersRound, roles: ADMIN },
      { key: "revenue", href: "/dashboard/revenue", icon: Wallet, roles: ADMIN },
      mod("invoices"),
    ],
  },
  {
    group: "ai",
    items: [
      { key: "aiHub", href: "/dashboard/ai", icon: Bot, roles: ALL },
      // Clients see documents the agency shared with them.
      { key: "aiLibrary", href: "/dashboard/ai/history", icon: Library, roles: ALL },
    ],
  },
  { group: "system", items: [{ key: "settings", href: "/dashboard/settings", icon: Settings, roles: ALL }] },
];

export function navForRole(role: Role | undefined) {
  return dashboardNav
    .map((g) => ({ ...g, items: g.items.filter((i) => !!role && i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}
