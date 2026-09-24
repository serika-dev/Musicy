"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { API_GROUPS } from "@/lib/developer-docs";
import { cn } from "@/lib/utils";

export const DOCS_NAV: {
  title: string;
  items: { label: string; href: string }[];
}[] = [
  {
    title: "Getting started",
    items: [
      { label: "Introduction", href: "/developers/docs" },
      { label: "Authentication", href: "/developers/docs/authentication" },
      { label: "Conventions", href: "/developers/docs/web-api" },
    ],
  },
  {
    title: "API reference",
    items: API_GROUPS.map((g) => ({
      label: g.title,
      href: `/developers/docs/api/${g.slug}`,
    })),
  },
  {
    title: "Embeds",
    items: [
      { label: "oEmbed", href: "/developers/docs/oembed" },
      {
        label: "Embed player & iFrame API",
        href: "/developers/docs/iframe-sdk",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "API playground", href: "/developers/playground" },
      { label: "API keys", href: "/developers/dashboard" },
    ],
  },
];

export interface TocItem {
  id: string;
  title: string;
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="space-y-6">
      {DOCS_NAV.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-xs font-semibold text-foreground">
            {section.title}
          </p>
          <ul className="space-y-0.5 border-l border-border">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-ml-px block border-l px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-primary font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Highlights the section currently in view. */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (ids.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export function DocsShell({
  children,
  toc = [],
}: {
  children: ReactNode;
  toc?: TocItem[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const current = DOCS_NAV.flatMap((s) => s.items).find(
    (i) => i.href === pathname,
  );
  const active = useActiveHeading(toc.map((t) => t.id));

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
      {/* Phones: collapsible page picker */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="flex h-12 w-full items-center justify-between text-sm font-medium"
        >
          <span>{current?.label ?? "Documentation"}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              mobileOpen && "rotate-180",
            )}
          />
        </button>
        {mobileOpen && (
          <div className="max-h-[70vh] overflow-y-auto pb-6">
            <Nav onNavigate={() => setMobileOpen(false)} />
          </div>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
        <aside className="hidden lg:block">
          <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto py-10 pr-2 no-scrollbar">
            <Nav />
          </div>
        </aside>

        <article className="min-w-0 py-10 lg:py-12">{children}</article>

        {toc.length > 0 && (
          <aside className="hidden xl:block">
            <div className="sticky top-16 py-12">
              <p className="mb-3 text-xs font-semibold text-foreground">
                On this page
              </p>
              <ul className="space-y-2 text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className={cn(
                        "block transition-colors",
                        active === t.id
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
