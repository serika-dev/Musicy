import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import {
  AUTH_LABEL,
  type AuthMode,
  type HttpMethod,
  type Param,
} from "@/lib/developer-docs";
import { cn } from "@/lib/utils";

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-300",
  POST: "bg-sky-500/15 text-sky-300",
  PUT: "bg-amber-500/15 text-amber-300",
  DELETE: "bg-rose-500/15 text-rose-300",
};

export function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[3.25rem] items-center justify-center rounded px-1.5 font-mono text-[11px] font-semibold",
        METHOD_STYLE[method],
        className,
      )}
    >
      {method}
    </span>
  );
}

export function AuthBadge({ auth }: { auth: AuthMode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ring-1",
        auth === "required"
          ? "text-foreground ring-foreground/25"
          : auth === "optional"
            ? "text-muted-foreground ring-border"
            : "text-muted-foreground ring-border",
      )}
    >
      {AUTH_LABEL[auth]}
    </span>
  );
}

export function Callout({
  kind = "info",
  title,
  children,
}: {
  kind?: "info" | "tip" | "warning";
  title?: string;
  children: ReactNode;
}) {
  const Icon =
    kind === "warning" ? AlertTriangle : kind === "tip" ? Lightbulb : Info;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg p-4 text-sm ring-1",
        kind === "warning"
          ? "bg-amber-500/10 ring-amber-500/25"
          : "bg-primary/10 ring-primary/25",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          kind === "warning" ? "text-amber-300" : "text-primary",
        )}
      />
      <div className="min-w-0 space-y-1 leading-relaxed text-foreground/90">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function ParamTable({
  title,
  params,
}: {
  title: string;
  params: Param[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-[13px] font-semibold text-muted-foreground">
        {title}
      </h4>
      <div className="divide-y divide-border rounded-lg ring-1 ring-border">
        {params.map((p) => (
          <div
            key={p.name}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              <code className="font-mono text-[13px] font-semibold text-foreground">
                {p.name}
              </code>
              <span className="font-mono text-[11px] text-muted-foreground">
                {p.type}
              </span>
              {p.required && (
                <span className="text-[11px] font-medium text-amber-300">
                  required
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Inline code in prose. */
export function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-foreground/[0.08] px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

/** Page title block used at the top of every docs page. */
export function DocHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
}) {
  return (
    <header className="mb-10 border-b border-border pb-8">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <div className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {lead}
      </div>
    </header>
  );
}

/** A titled section that the "On this page" list can link to. */
export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">
        <a href={`#${id}`} className="hover:underline underline-offset-4">
          {title}
        </a>
      </h2>
      <div className="space-y-4 leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}
