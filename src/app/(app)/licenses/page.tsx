import { ExternalLink } from "lucide-react";

export const metadata = {
  title: "Licenses — Serika",
  description: "Open-source software and technologies used to build Serika.",
};

type License = {
  name: string;
  version: string;
  license: string;
  url: string;
  description: string;
};

type LicenseCategory = {
  title: string;
  icon: string;
  items: License[];
};

const CATEGORIES: LicenseCategory[] = [
  {
    title: "Framework & Runtime",
    icon: "⚡",
    items: [
      {
        name: "Next.js",
        version: "16.1.6",
        license: "MIT",
        url: "https://nextjs.org",
        description: "React framework for production — routing, SSR, and API layers.",
      },
      {
        name: "React",
        version: "19.2.3",
        license: "MIT",
        url: "https://react.dev",
        description: "UI library for building component-based interfaces.",
      },
      {
        name: "TypeScript",
        version: "5.x",
        license: "Apache-2.0",
        url: "https://www.typescriptlang.org",
        description: "Typed superset of JavaScript that compiles to plain JS.",
      },
    ],
  },
  {
    title: "UI & Styling",
    icon: "🎨",
    items: [
      {
        name: "Tailwind CSS",
        version: "4.x",
        license: "MIT",
        url: "https://tailwindcss.com",
        description: "Utility-first CSS framework for rapid UI development.",
      },
      {
        name: "@tailwindcss/postcss",
        version: "4.1.18",
        license: "MIT",
        url: "https://tailwindcss.com/docs/installation/using-postcss",
        description: "PostCSS plugin that enables Tailwind CSS v4 processing.",
      },
      {
        name: "shadcn/ui",
        version: "New York",
        license: "MIT",
        url: "https://ui.shadcn.com",
        description: "Re-usable component collection built on Radix primitives.",
      },
      {
        name: "Radix UI",
        version: "1.x",
        license: "MIT",
        url: "https://www.radix-ui.com",
        description: "Unstyled, accessible React primitives (dialog, dropdown, tabs, etc.).",
      },
      {
        name: "Lucide React",
        version: "0.563.0",
        license: "ISC",
        url: "https://lucide.dev",
        description: "Open-source icon set used throughout the interface.",
      },
      {
        name: "Embla Carousel",
        version: "8.6.0",
        license: "MIT",
        url: "https://www.embla-carousel.com",
        description: "Lightweight carousel library for React, with autoplay plugin.",
      },
      {
        name: "Sonner",
        version: "2.0.7",
        license: "MIT",
        url: "https://sonner.emilkowal.ski",
        description: "Toast notification library.",
      },
      {
        name: "class-variance-authority",
        version: "0.7.1",
        license: "Apache-2.0",
        url: "https://cva.style",
        description: "Utility for creating variant-driven component APIs.",
      },
      {
        name: "clsx",
        version: "2.1.1",
        license: "MIT",
        url: "https://github.com/lukeed/clsx",
        description: "Tiny utility for conditionally joining class names.",
      },
      {
        name: "tailwind-merge",
        version: "3.4.1",
        license: "MIT",
        url: "https://github.com/dcastil/tailwind-merge",
        description: "Intelligently merges Tailwind CSS classes without conflicts.",
      },
      {
        name: "tw-animate-css",
        version: "1.3.2",
        license: "MIT",
        url: "https://github.com/ikcb/tw-animate-css",
        description: "Animation utilities for Tailwind CSS v4.",
      },
    ],
  },
  {
    title: "Data & Auth",
    icon: "🗄️",
    items: [
      {
        name: "Prisma",
        version: "6.16.1",
        license: "Apache-2.0",
        url: "https://www.prisma.io",
        description: "Type-safe ORM for PostgreSQL database access.",
      },
      {
        name: "NextAuth.js",
        version: "4.24.11",
        license: "ISC",
        url: "https://next-auth.js.org",
        description: "Authentication library for Next.js.",
      },
      {
        name: "@auth/prisma-adapter",
        version: "2.10.0",
        license: "MIT",
        url: "https://authjs.dev",
        description: "Prisma adapter for NextAuth.js session storage.",
      },
      {
        name: "TanStack Query",
        version: "5.87.4",
        license: "MIT",
        url: "https://tanstack.com/query",
        description: "Async state management and data fetching for React.",
      },
      {
        name: "Zod",
        version: "4.3.6",
        license: "MIT",
        url: "https://zod.dev",
        description: "Schema validation library used for forms and API input.",
      },
      {
        name: "React Hook Form",
        version: "7.62.0",
        license: "MIT",
        url: "https://react-hook-form.com",
        description: "Performant form library with minimal re-renders.",
      },
      {
        name: "@hookform/resolvers",
        version: "5.2.1",
        license: "MIT",
        url: "https://github.com/react-hook-form/resolvers",
        description: "Schema validation resolvers bridging React Hook Form with Zod.",
      },
      {
        name: "bcryptjs",
        version: "3.0.2",
        license: "MIT",
        url: "https://github.com/dcodeIO/bcrypt.js",
        description: "Password hashing library for secure credential storage.",
      },
      {
        name: "ioredis",
        version: "5.9.3",
        license: "MIT",
        url: "https://github.com/redis/ioredis",
        description: "Redis client for caching and session management.",
      },
    ],
  },
  {
    title: "Storage & Media",
    icon: "🎵",
    items: [
      {
        name: "AWS SDK for S3",
        version: "3.750.0",
        license: "Apache-2.0",
        url: "https://docs.aws.amazon.com/sdk-for-javascript",
        description: "S3-compatible client used with Backblaze B2 object storage.",
      },
      {
        name: "music-metadata",
        version: "10.9.1",
        license: "MIT",
        url: "https://github.com/Borewit/music-metadata",
        description: "Parses metadata (tags, artwork, duration) from audio files.",
      },
      {
        name: "serikaromanizer",
        version: "2.0.3",
        license: "MIT",
        url: "https://www.npmjs.com/package/serikaromanizer",
        description: "Custom library for romanizing artist and track metadata.",
      },
    ],
  },
  {
    title: "Mobile",
    icon: "📱",
    items: [
      {
        name: "Capacitor",
        version: "8.3.1",
        license: "MIT",
        url: "https://capacitorjs.com",
        description: "Cross-platform runtime for packaging the web app as a native mobile app.",
      },
      {
        name: "@capacitor/splash-screen",
        version: "8.0.1",
        license: "MIT",
        url: "https://capacitorjs.com/docs/apis/splash-screen",
        description: "Capacitor plugin for controlling the native splash screen.",
      },
      {
        name: "@capacitor/status-bar",
        version: "8.0.2",
        license: "MIT",
        url: "https://capacitorjs.com/docs/apis/status-bar",
        description: "Capacitor plugin for customizing the native status bar.",
      },
    ],
  },
  {
    title: "Tooling",
    icon: "🔧",
    items: [
      {
        name: "Biome",
        version: "2.2.0",
        license: "MIT",
        url: "https://biomejs.dev",
        description: "Fast linter and formatter replacing ESLint + Prettier.",
      },
      {
        name: "ts-node",
        version: "10.9.2",
        license: "MIT",
        url: "https://typestrong.org/ts-node",
        description: "TypeScript execution engine used for Prisma seeding scripts.",
      },
      {
        name: "dotenv",
        version: "17.2.2",
        license: "BSD-2-Clause",
        url: "https://github.com/motdotla/dotenv",
        description: "Loads environment variables from .env files.",
      },
      {
        name: "@types/node",
        version: "20.x",
        license: "MIT",
        url: "https://github.com/DefinitelyTyped/DefinitelyTyped",
        description: "TypeScript type definitions for Node.js APIs.",
      },
      {
        name: "@types/react",
        version: "19.x",
        license: "MIT",
        url: "https://github.com/DefinitelyTyped/DefinitelyTyped",
        description: "TypeScript type definitions for React.",
      },
      {
        name: "@types/react-dom",
        version: "19.x",
        license: "MIT",
        url: "https://github.com/DefinitelyTyped/DefinitelyTyped",
        description: "TypeScript type definitions for React DOM.",
      },
    ],
  },
  {
    title: "Services & Infrastructure",
    icon: "☁️",
    items: [
      {
        name: "Backblaze B2",
        version: "—",
        license: "Service",
        url: "https://www.backblaze.com/cloud-storage",
        description: "S3-compatible object storage for audio files and artwork.",
      },
      {
        name: "PostgreSQL",
        version: "—",
        license: "PostgreSQL License",
        url: "https://www.postgresql.org",
        description: "Open-source relational database powering all application data.",
      },
      {
        name: "Redis",
        version: "—",
        license: "RSALv2 / SSPL",
        url: "https://redis.io",
        description: "In-memory data store for caching and real-time features.",
      },
      {
        name: "LRCLib",
        version: "—",
        license: "MIT",
        url: "https://lrclib.net",
        description: "Free synced lyrics database used for real-time lyric display.",
      },
    ],
  },
];

export default function LicensesPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            Open Source
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Licenses &amp; Credits
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70">
            Serika is built on top of incredible open-source software and
            services. Below is a comprehensive list of every technology we use,
            along with its license type and a link to the project.
          </p>
        </div>
      </section>

      {CATEGORIES.map((category) => (
        <section key={category.title} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{category.icon}</span>
            <h2 className="text-xl font-bold text-white">{category.title}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {category.items.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur transition-colors hover:border-white/20"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>v{item.version}</span>
                      <span>•</span>
                      <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 font-medium text-purple-300">
                        {item.license}
                      </span>
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30 text-white/60 transition-colors hover:text-white"
                    title={`Visit ${item.name}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <h2 className="mb-3 text-2xl font-bold">Grateful for open source</h2>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          Every library listed here is the result of countless hours of
          volunteer work by maintainers and contributors. We thank them for
          making Serika possible.
        </p>
      </section>
    </div>
  );
}
