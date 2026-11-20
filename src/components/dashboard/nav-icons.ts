import {
  BarChart3, Bot, Briefcase, Clapperboard, Compass, CreditCard, Crosshair, FileText, FolderKanban, Gem, ImagePlus, Inbox, LayoutDashboard, Library,
  LifeBuoy, ListChecks, Megaphone, Palette, Settings, Stethoscope, Swords, Target, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";

/** Sidebar icon per nav key (client-side; the menu itself is built on the server). */
export const navIcons: Record<keyof Dictionary["dashboard"]["nav"], LucideIcon> = {
  overview: LayoutDashboard,
  leads: Inbox,
  requests: LifeBuoy,
  brandTasks: ListChecks,
  clients: Briefcase,
  projects: FolderKanban,
  campaigns: Megaphone,
  tasks: ListChecks,
  reports: BarChart3,
  team: UsersRound,
  revenue: Wallet,
  invoices: FileText,
  aiHub: Bot,
  aiLibrary: Library,
  settings: Settings,
  brand: Palette,
  growth: Stethoscope,
  plan: CreditCard,
  growthTasks: ListChecks,
  brandKit: Gem,
  strategyTool: Compass,
  metaTool: Megaphone,
  offerTool: Swords,
  postTool: ImagePlus,
  contentStudio: Clapperboard,
  identityTool: Crosshair,
  allTools: Bot,
  plannerTool: Target,
};
