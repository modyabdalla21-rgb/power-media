import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] };

const textOf = (node: HastNode): string =>
  node.type === "text" ? (node.value ?? "") : (node.children ?? []).map(textOf).join("");

const childEls = (node: HastNode, tag: string) => (node.children ?? []).filter((c) => c.type === "element" && c.tagName === tag);

/**
 * Labels each table cell with its column header (`data-label`) so tables can
 * stack into readable cards on small screens instead of scrolling sideways.
 */
function rehypeCellLabels() {
  const walk = (node: HastNode) => {
    if (node.type === "element" && node.tagName === "table") {
      const rows = [...childEls(node, "thead"), ...childEls(node, "tbody")].flatMap((s) => childEls(s, "tr"));
      const headers = (rows[0] ? childEls(rows[0], "th") : []).map((th) => textOf(th).trim());
      for (const tr of rows) {
        childEls(tr, "td").forEach((td, i) => {
          if (headers[i]) td.properties = { ...td.properties, dataLabel: headers[i] };
        });
      }
    }
    node.children?.forEach(walk);
  };
  return (tree: HastNode) => walk(tree);
}

/**
 * Renders AI Markdown output. Raw HTML in the source is NOT rendered
 * (react-markdown default), so model output can't inject markup.
 */
export function Markdown({ text, dir, className }: { text: string; dir?: "ltr" | "rtl"; className?: string }) {
  return (
    <div dir={dir} className={cn("ai-prose min-w-0 max-w-full text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeCellLabels]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-300 underline underline-offset-2 hover:text-white">{children}</a>
          ),
          table: ({ children }) => (
            <div className="ai-table my-4 rounded-xl border border-line sm:overflow-x-auto">
              <table className="w-full text-start text-[13px] sm:min-w-[480px]">{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
