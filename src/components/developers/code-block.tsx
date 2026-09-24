"use client";

import { Check, Copy } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export interface CodeTab {
  label: string;
  code: string;
}

// Tiny tokenizer: strings, numbers, keywords and comments get a tint. Enough
// to make JSON / JS / shell / Python readable without a highlighting library.
const TOKEN =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\/\/[^\n]*|#[^\n{]*$|<!--[\s\S]*?-->)|\b(\d+(?:\.\d+)?)\b|\b(const|let|await|async|new|return|import|from|true|false|null|None|True|False|curl|function)\b/gm;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of code.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last)
      out.push(<Fragment key={i++}>{code.slice(last, start)}</Fragment>);
    const [text, str, comment, num] = m;
    // A string directly followed by ":" is a JSON/object key.
    const isKey =
      str &&
      code
        .slice(start + text.length)
        .trimStart()
        .startsWith(":");
    const cls = comment
      ? "text-white/40 italic"
      : str
        ? isKey
          ? "text-sky-300"
          : "text-emerald-300"
        : num
          ? "text-amber-300"
          : "text-violet-300";
    out.push(
      <span key={i++} className={cls}>
        {text}
      </span>,
    );
    last = start + text.length;
  }
  if (last < code.length)
    out.push(<Fragment key={i++}>{code.slice(last)}</Fragment>);
  return out;
}

interface CodeBlockProps {
  /** One snippet, or several shown as tabs (e.g. cURL / JavaScript / Python). */
  tabs: CodeTab[];
  title?: string;
  className?: string;
}

export function CodeBlock({ tabs, title, className }: CodeBlockProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = tabs[Math.min(active, tabs.length - 1)];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context); nothing sensible to do
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-[#0d0d10] ring-1 ring-white/10",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-white/10 px-2">
        {title && tabs.length === 1 ? (
          <span className="px-2 py-2.5 text-xs font-medium text-white/60">
            {title}
          </span>
        ) : (
          <div
            className="flex min-w-0 gap-1 overflow-x-auto no-scrollbar"
            role="tablist"
          >
            {tabs.map((t, i) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  "relative whitespace-nowrap px-2.5 py-2.5 text-xs font-medium transition-colors",
                  i === active
                    ? "text-white"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                {t.label}
                {i === active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-white/85">
        <code>{highlight(current.code)}</code>
      </pre>
    </div>
  );
}
