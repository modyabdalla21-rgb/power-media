"use client";
import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Circle, CircleCheck, CircleDot, Loader2, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { addTask, deleteTask, setTaskStatus } from "@/lib/hub/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

type D = Dictionary["dashboard"];
export type HubTask = {
  id: string; title: string; details: string | null; category: string; priority: string; status: string;
  due_date: string | null; plan_id: string | null; tool_hint: string | null; source: string;
};
const CATEGORIES = ["content", "video", "ads", "social", "brand", "website", "research", "other"] as const;

export function TaskBoard({ d, tasks, plans, toolHrefs, dateFmt }: {
  d: D;
  tasks: HubTask[];
  plans: { id: string; title: string }[];
  toolHrefs: Record<string, string>;
  /** Pre-formatted due dates (server locale formatting). */
  dateFmt: Record<string, string>;
}) {
  const h = d.hub;
  const o = d.options as Record<string, string>;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<"open" | "done" | "all">("open");
  const [plan, setPlan] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const planTitle = Object.fromEntries(plans.map((p) => [p.id, p.title]));

  const visible = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (status === "all" || (status === "done" ? t.status === "done" : t.status !== "done")) &&
          (!plan || (plan === "none" ? !t.plan_id : t.plan_id === plan)) &&
          (!category || t.category === category),
      ),
    [tasks, status, plan, category],
  );

  const act = (id: string, fn: () => Promise<{ ok: boolean }>) => {
    setBusyId(id);
    start(async () => {
      const r = await fn();
      setError(!r.ok);
      router.refresh();
      setBusyId(null);
    });
  };

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    act("new", async () => {
      const r = await addTask({ title, category: String(fd.get("category") ?? "other"), dueDate: String(fd.get("due") ?? ""), planId: String(fd.get("plan") ?? "") });
      if (r.ok) form.reset();
      return r;
    });
  }

  const chip = (key: "open" | "done" | "all", label: string, n: number) => (
    <button
      type="button"
      onClick={() => setStatus(key)}
      aria-pressed={status === key}
      className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors", status === key ? "border-blue/50 bg-blue/15 text-white" : "border-line text-ink-muted hover:text-white")}
    >
      {label}
      <span className="text-xs tabular-nums text-ink-subtle">{n}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input name="title" maxLength={200} placeholder={h.taskTitlePlaceholder} aria-label={h.taskTitlePlaceholder} required />
        <Select name="category" defaultValue="other" aria-label={d.fields.category} className="sm:w-36">
          {CATEGORIES.map((c) => <option key={c} value={c}>{o[c]}</option>)}
        </Select>
        <Input name="due" type="date" aria-label={d.fields.dueDate} className="sm:w-40" />
        <input type="hidden" name="plan" value={plan && plan !== "none" ? plan : ""} />
        <Button type="submit" disabled={pending}>
          {busyId === "new" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          {h.addTaskCta}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {chip("open", h.filterOpen, tasks.filter((t) => t.status !== "done").length)}
        {chip("done", h.filterDone, tasks.filter((t) => t.status === "done").length)}
        {chip("all", h.filterAll, tasks.length)}
        <div className="flex w-full gap-2 sm:ms-auto sm:w-auto">
          {plans.length > 0 && (
            <Select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label={h.allPlans} className="h-10 min-w-0 flex-1 sm:w-44">
              <option value="">{h.allPlans}</option>
              <option value="none">{h.noPlan}</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          )}
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={h.allCategories} className="h-10 min-w-0 flex-1 sm:w-40">
            <option value="">{h.allCategories}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{o[c]}</option>)}
          </Select>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-yellow">{h.error}</p>}

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-subtle">{h.tasksEmpty}</p>
      ) : visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-ink-subtle">{h.noMatches}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {visible.map((t) => {
            const isDone = t.status === "done";
            const overdue = !isDone && t.due_date && t.due_date < today;
            const href = t.tool_hint ? toolHrefs[t.tool_hint] : null;
            const busy = busyId === t.id;
            return (
              <li key={t.id} className={cn("flex items-start gap-2 p-2 sm:gap-3 sm:p-3", isDone && "opacity-60")}>
                <button
                  type="button"
                  onClick={() => act(t.id, () => setTaskStatus(t.id, isDone ? "todo" : "done"))}
                  disabled={pending}
                  aria-label={isDone ? h.markTodo : h.markDone}
                  title={isDone ? h.markTodo : h.markDone}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-white/5 hover:text-blue-300"
                >
                  {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : isDone ? <CircleCheck className="size-5 text-blue-300" aria-hidden /> : t.status === "in_progress" ? <CircleDot className="size-5 text-yellow" aria-hidden /> : <Circle className="size-5" aria-hidden />}
                </button>
                <div className="min-w-0 flex-1 py-1.5">
                  <p className={cn("font-medium break-words", isDone && "line-through")} dir="auto">{t.title}</p>
                  {t.details && <p className="mt-0.5 text-sm leading-relaxed break-words text-ink-muted" dir="auto">{t.details}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <StatusBadge value="neutral" label={o[t.category] ?? t.category} />
                    {t.priority === "high" && <StatusBadge value="high" label={o.high} />}
                    {t.status === "in_progress" && <StatusBadge value="in_progress" label={o.in_progress} />}
                    {t.source === "ai" && <StatusBadge value="active" label={h.fromAi} />}
                    {t.plan_id && planTitle[t.plan_id] && <span className="max-w-48 truncate text-ink-subtle">{planTitle[t.plan_id]}</span>}
                    {t.due_date && <span className={overdue ? "font-medium text-yellow" : "text-ink-subtle"}>{overdue ? `${h.overdue} · ` : ""}{h.due.replace("{date}", dateFmt[t.due_date] ?? t.due_date)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  {href && !isDone && (
                    <Link href={`${href}${href.includes("#") ? "" : `?brief=${encodeURIComponent(t.title)}`}`} aria-label={h.doWithAi} title={h.doWithAi} className="inline-flex size-10 items-center justify-center rounded-lg text-yellow hover:bg-orange/10">
                      <Sparkles className="size-4" aria-hidden />
                    </Link>
                  )}
                  {t.status === "todo" && (
                    <button type="button" onClick={() => act(t.id, () => setTaskStatus(t.id, "in_progress"))} disabled={pending} aria-label={h.start} title={h.start} className="inline-flex size-10 items-center justify-center rounded-lg text-ink-subtle hover:bg-white/5 hover:text-white">
                      <Play className="flip-rtl size-4" aria-hidden />
                    </button>
                  )}
                  <button type="button" onClick={() => act(t.id, () => deleteTask(t.id))} disabled={pending} aria-label={h.deleteTask} title={h.deleteTask} className="inline-flex size-10 items-center justify-center rounded-lg text-ink-subtle hover:bg-orange/10 hover:text-yellow">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
