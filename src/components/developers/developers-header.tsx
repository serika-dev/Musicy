"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  {
    href: "/developers/docs",
    label: "Docs",
    match: (p: string) =>
      p.startsWith("/developers/docs") && !p.startsWith("/developers/docs/api"),
  },
  {
    href: "/developers/docs/api/tracks",
    label: "API reference",
    match: (p: string) => p.startsWith("/developers/docs/api"),
  },
  {
    href: "/developers/playground",
    label: "Playground",
    match: (p: string) => p.startsWith("/developers/playground"),
  },
];

export function DevelopersHeader() {
  const pathname = usePathname() ?? "";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/developers"
          className="flex shrink-0 items-center gap-2"
          aria-label="Musicy for Developers"
        >
          <Logo size="sm" />
          <span className="hidden rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-xs font-semibold text-muted-foreground sm:inline">
            Developers
          </span>
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Developers"
        >
          {LINKS.map((l) => {
            const on = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/"
            className="hidden px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:block"
          >
            Open Musicy
          </Link>
          <Link
            href="/developers/dashboard"
            className="inline-flex h-8 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-transform hover:scale-105"
          >
            API keys
          </Link>
        </div>
      </div>
    </header>
  );
}
