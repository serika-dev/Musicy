"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Globe, ExternalLink, ChevronUp, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers", badge: "Hiring" },
      { label: "Press & News", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Communities",
    links: [
      { label: "For Artists", href: "/artists" },
      { label: "Developers", href: "/developers" },
      { label: "Advertising", href: "/advertising" },
      { label: "Investors", href: "/investors" },
    ],
  },
  {
    title: "Useful Links",
    links: [
      { label: "Support & Help", href: "/support" },
      { label: "Web Player", href: "/" },
      { label: "Free Mobile App", href: "/download" },
      { label: "Audio Quality (FLAC)", href: "/hifi" },
    ],
  },
  {
    title: "Plans & Pricing",
    links: [
      { label: "Premium Individual", href: "/premium" },
      { label: "Premium Duo", href: "/premium#duo" },
      { label: "Premium Family", href: "/premium#family" },
      { label: "Student Discount", href: "/premium#student" },
    ],
  },
];

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // Determine if we should visually hide the footer.
  // We use CSS hidden instead of returning null to prevent React hydration structural mismatches
  // if usePathname() differs between SSR and initial client hydration.
  const isHidden = pathname?.startsWith("/admin");

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
      className={cn(
        "relative w-full overflow-hidden border-t border-white/5 bg-black/40 mt-16 pt-12 pb-4 lg:pb-6",
        className,
        isHidden ? "hidden" : "block"
      )}
    >
      {/* Ambient Glowing Background Effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 -z-10 h-[250px] w-[350px] rounded-full bg-violet-600/10 blur-[100px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <Logo size="md" />
            </Link>
            <p className="text-xs leading-relaxed text-zinc-400 max-w-xs">
              Next-generation lossless music streaming platform with spatial audio, live lyrics, and artist monetization.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                <Globe className="mr-1.5 h-3.5 w-3.5 text-purple-400" />
                English (US)
              </Button>
            </div>
          </div>

          {/* Nav Link Columns */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                {column.title}
              </h3>
              <ul className="space-y-2 text-xs">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-400 transition-colors hover:text-white"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-white"
                      >
                        {link.label}
                        {link.badge && (
                          <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-medium text-purple-300 border border-purple-500/30">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-white/10" />

        {/* Bottom Bar: Copyright, Legal Links, Scroll to Top */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 text-xs text-zinc-500 sm:flex-row">
          <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/cookies" className="hover:text-zinc-300 transition-colors">
              Cookie Preferences
            </Link>
            <span>•</span>
            <Link href="/security" className="hover:text-zinc-300 transition-colors">
              Security
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <p>© {year} Serika Ecosystem. All rights reserved.</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollToTop}
              title="Back to top"
              className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
