import {
  BarChart3, Bot, Briefcase, FileText, FolderKanban, LayoutDashboard, ListChecks, Megaphone,
  Settings, Users, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type DashboardNavKey = keyof Dictionary["dashboard"]["nav"];
export type ModuleKey = keyof Dictionary["dashboard"]["modules"];

export const moduleKeys = ["clients", "projects", "campaigns", "tasks", "team", "reports", "revenue", "invoices"] as const satisfies readonly ModuleKey[];

export const dashboardNav: {
  group: keyof Dictionary["dashboard"]["groups"];
  items: { key: DashboardNavKey; href: string; icon: LucideIcon }[];
}[] = [
  {
    group: "agency",
    items: [
      { key: "overview", href: "/dashboard", icon: LayoutDashboard },
      { key: "clients", href: "/dashboard/clients", icon: Briefcase },
      { key: "projects", href: "/dashboard/projects", icon: FolderKanban },
      { key: "campaigns", href: "/dashboard/campaigns", icon: Megaphone },
      { key: "tasks", href: "/dashboard/tasks", icon: ListChecks },
      { key: "team", href: "/dashboard/team", icon: UsersRound },
      { key: "reports", href: "/dashboard/reports", icon: BarChart3 },
      { key: "revenue", href: "/dashboard/revenue", icon: Wallet },
      { key: "invoices", href: "/dashboard/invoices", icon: FileText },
    ],
  },
  { group: "ai", items: [{ key: "aiHub", href: "/dashboard/ai", icon: Bot }] },
  { group: "system", items: [{ key: "settings", href: "/dashboard/settings", icon: Settings }] },
];

export const moduleIcons: Record<ModuleKey, LucideIcon> = {
  clients: Briefcase,
  projects: FolderKanban,
  campaigns: Megaphone,
  tasks: ListChecks,
  team: Users,
  reports: BarChart3,
  revenue: Wallet,
  invoices: FileText,
};
