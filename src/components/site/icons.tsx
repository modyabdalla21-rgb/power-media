import {
  Clapperboard, FileBarChart, MessagesSquare, MonitorSmartphone, PenLine, Search, Sparkles, Target,
  TrendingUp, Users, Workflow, type LucideIcon,
} from "lucide-react";
import type { ToolKey } from "@/lib/ai/tools";

export const serviceIcons: Record<string, LucideIcon> = {
  brand: Sparkles,
  performance: TrendingUp,
  social: MessagesSquare,
  content: Clapperboard,
  seo: Search,
  web: MonitorSmartphone,
  automation: Workflow,
  influencer: Users,
};

export const toolIcons: Record<ToolKey, LucideIcon> = {
  adStudio: PenLine,
  mediaPlanner: Target,
  reportGenerator: FileBarChart,
};

/** Icon tile used across services, AI tools and dashboard cards. */
export function IconTile({ icon: Icon, tone = "blue", className = "" }: { icon: LucideIcon; tone?: "blue" | "energy"; className?: string }) {
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl border ${
        tone === "blue" ? "border-blue/25 bg-blue/10 text-blue-300" : "border-orange/30 bg-orange/10 text-yellow"
      } ${className}`}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}
