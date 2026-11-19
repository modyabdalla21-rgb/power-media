import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders AI Markdown output. Raw HTML in the source is NOT rendered
 * (react-markdown default), so model output can't inject markup.
 */
export function Markdown({ text, dir, className }: { text: string; dir?: "ltr" | "rtl"; className?: string }) {
  return (
    <div dir={dir} className={cn("ai-prose text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-300 underline underline-offset-2 hover:text-white">{children}</a>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[480px] text-start text-[13px]">{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
