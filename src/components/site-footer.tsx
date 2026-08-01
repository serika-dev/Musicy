"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Globe, ExternalLink, ChevronUp, Music2 } from "lucide-react";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
  badge?: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const COLUMNS: FooterColumn[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "https://serika.dev", external: true },
      { label: "Careers", href: "https://serika.dev", external: true },
      { label: "Serika Ecosystem", href: "https://serika.dev", external: true },
      { label: "Press & Brand", href: "https://serika.dev", external: true },
    ],
  },
  {
    title: "Communities",
    links: [
      { label: "For Artists", href: "/artists" },
      { label: "Developer Hub", href: "/developers" },
      { label: "API Docs", href: "/developers/docs", badge: "v2" },
      { label: "SDK Playground", href: "/developers/playground", badge: "NEW" },
    ],
  },
  {
    title: "Useful Links",
    links: [
      {
        label: "Support & Help",
        href: "mailto:support@serika.dev",
        external: true,
      },
      { label: "Downloads", href: "/downloads", badge: "24-bit" },
      { label: "Search Tracks", href: "/search" },
      { label: "Preferences", href: "/settings" },
    ],
  },
];

const LEGAL: FooterLink[] = [
  { label: "Legal", href: "https://serika.dev", external: true },
  { label: "Privacy Policy", href: "https://serika.dev", external: true },
  { label: "Cookies", href: "https://serika.dev", external: true },
  { label: "Accessibility", href: "https://serika.dev", external: true },
  { label: "Security", href: "https://serika.dev", external: true },
];

function FooterNavLink({ link }: { link: FooterLink }) {
  const isExternal = link.external;
  const isMail = link.href.startsWith("mailto:");

  const content = (
    <span className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-white">
      <span className="relative">
        {link.label}
        <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-purple-500 transition-all duration-300 group-hover:w-full rounded-full" />
      </span>
      {link.badge && (
        <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-purple-400 ring-1 ring-purple-500/20">
          {link.badge}
        </span>
      )}
      {isExternal && !isMail && (
        <ExternalLink className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
      )}
    </span>
  );

  if (isExternal) {
    return (
      <a
        href={link.href}
        target={isMail ? undefined : "_blank"}
        rel={isMail ? undefined : "noopener noreferrer"}
      >
        {content}
      </a>
    );
  }

  return <Link href={link.href}>{content}</Link>;
}

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      className={`relative w-full overflow-hidden border-t border-white/5 bg-black/40 mt-16 pt-16 pb-48 lg:pb-56 ${
        className ?? ""
      }`}
    >
      {/* Ambient Glowing Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[250px] -left-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] opacity-70" />
        <div className="absolute top-[20%] right-[5%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[150px] opacity-60" />
      </div>

      <div className="relative w-full px-6 lg:px-10 max-w-none">
        {/* Top Section: Flex Layout with Generous Gaps */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-16 mb-16">
          
          {/* Brand Column */}
          <div className="max-w-xs space-y-6 shrink-0">
            <div className="flex flex-col items-start gap-4">
              <Logo size="lg" className="text-purple-500" />
              <p className="text-sm text-muted-foreground/90 leading-relaxed font-medium">
                Experience your library in full FLAC fidelity. No compression, just pure sound.
                Built for audiophiles, designed for everyone.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="h-10 w-10 rounded-full border-white/10 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-400 transition-all duration-300 text-foreground/80 shadow-lg"
              >
                <a
                  href="https://serika.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ecosystem"
                >
                  <Globe className="h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="outline"
                size="icon"
                asChild
                className="h-10 w-10 rounded-full border-white/10 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-400 transition-all duration-300 text-foreground/80 shadow-lg"
              >
                <a
                  href="https://x.com/serikadev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.725-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                  </svg>
                </a>
              </Button>

              <Button
                variant="outline"
                size="icon"
                asChild
                className="h-10 w-10 rounded-full border-white/10 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-400 transition-all duration-300 text-foreground/80 shadow-lg"
              >
                <a
                  href="https://github.com/serika-dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 .5C5.73.5.75 5.48.75 11.76c0 4.97 3.22 9.18 7.69 10.67.56.1.77-.24.77-.54v-1.9c-3.13.68-3.79-1.51-3.79-1.51-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 .1.71 1.72 2.72 1.23.09-.76.39-1.23.71-1.51-2.5-.28-5.12-1.25-5.12-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.11 1.15a10.7 10.7 0 0 1 5.66 0c2.16-1.45 3.11-1.15 3.11-1.15.61 1.54.23 2.68.11 2.96.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.28-5.14 5.56.4.34.76 1.02.76 2.06v3.05c0 .3.21.65.78.54A11.02 11.02 0 0 0 23.25 11.76C23.25 5.48 18.27.5 12 .5z" />
                  </svg>
                </a>
              </Button>
            </div>
          </div>

          {/* Link Columns Grid with explicit min-width to prevent overlaps */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-16 lg:gap-20">
            {COLUMNS.map((column) => (
              <div key={column.title} className="space-y-4 min-w-[140px]">
                <h4 className="text-sm font-bold tracking-wider text-white">
                  {column.title}
                </h4>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <FooterNavLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-8 bg-white/5" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-[13px] text-muted-foreground/80">
          {/* Copyright */}
          <div className="flex items-center gap-2 font-medium text-white/70 shrink-0">
            <Music2 className="h-4 w-4 text-purple-500" />
            <span>© {year} Serika.</span>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {LEGAL.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors duration-200"
                target={link.external ? "_blank" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Back to top button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={scrollToTop}
            className="group h-9 gap-2 rounded-full px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all duration-300 shrink-0"
          >
            <span>Back to top</span>
            <ChevronUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:text-purple-400" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
