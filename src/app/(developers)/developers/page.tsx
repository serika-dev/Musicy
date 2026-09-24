import { ArrowRight, Code2, KeyRound, PlayCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { MethodBadge } from "@/components/developers/docs-ui";
import { ALL_ENDPOINTS, API_GROUPS, snippets } from "@/lib/developer-docs";
import { getAppUrl } from "@/lib/seo";

const CARDS = [
  {
    href: "/developers/docs/api/tracks",
    icon: Code2,
    title: "Web API",
    body: "REST endpoints for tracks, albums, artists, playlists, search and the listener's library.",
  },
  {
    href: "/developers/docs/iframe-sdk",
    icon: PlayCircle,
    title: "Embed player",
    body: "Drop a Musicy player into any page with an iframe, and control it from JavaScript.",
  },
  {
    href: "/developers/docs/oembed",
    icon: Share2,
    title: "oEmbed",
    body: "Turn a Musicy link into a rich preview in chat apps, CMSs and forums.",
  },
];

export default function DevelopersHome() {
  const base = getAppUrl();
  const search = ALL_ENDPOINTS.find((e) => e.id === "search");
  const example = search ? snippets(base, search) : null;
  const count = ALL_ENDPOINTS.length;

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_20%_0%,hsl(var(--primary)/0.22),transparent_70%)]"
        />
        <div className="mx-auto grid max-w-[90rem] gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-center lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">
              Musicy for Developers
            </p>
            <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Build with lossless music.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              A straightforward REST API over the whole catalogue, the
              listener&apos;s library and quality-aware streaming, plus embeds
              that work anywhere a link does.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/developers/docs"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 font-semibold text-background transition-transform hover:scale-105"
              >
                Read the docs <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/developers/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-full px-6 font-semibold ring-1 ring-foreground/30 transition-colors hover:ring-foreground"
              >
                <KeyRound className="h-4 w-4" /> Get an API key
              </Link>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Endpoints</dt>
                <dd className="text-xl font-semibold">{count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Auth</dt>
                <dd className="text-xl font-semibold">Bearer key</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Audio</dt>
                <dd className="text-xl font-semibold">Up to 24-bit FLAC</dd>
              </div>
            </dl>
          </div>
          {example && (
            <CodeBlock
              tabs={[
                { label: "cURL", code: example.curl },
                { label: "JavaScript", code: example.js },
                { label: "Python", code: example.py },
              ]}
              className="shadow-2xl shadow-black/50"
            />
          )}
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-[90rem] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-xl bg-raised p-6 transition-colors hover:bg-foreground/[0.07]"
            >
              <c.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{c.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {c.body}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                Learn more{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Reference index */}
      <section className="mx-auto max-w-[90rem] px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">API reference</h2>
            <p className="mt-1 text-muted-foreground">
              Every endpoint, grouped by what it works with.
            </p>
          </div>
          <Link
            href="/developers/playground"
            className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:block"
          >
            Try them in the playground
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {API_GROUPS.map((g) => (
            <Link
              key={g.slug}
              href={`/developers/docs/api/${g.slug}`}
              className="rounded-xl p-5 ring-1 ring-border transition-colors hover:bg-foreground/[0.04] hover:ring-foreground/25"
            >
              <h3 className="font-semibold">{g.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {g.description}
              </p>
              <ul className="mt-4 space-y-1.5">
                {g.endpoints.slice(0, 4).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 text-[13px]"
                  >
                    <MethodBadge
                      method={e.method}
                      className="min-w-[3.25rem]"
                    />
                    <code className="truncate font-mono text-muted-foreground">
                      {e.path}
                    </code>
                  </li>
                ))}
                {g.endpoints.length > 4 && (
                  <li className="pl-[3.75rem] text-[13px] text-muted-foreground">
                    +{g.endpoints.length - 4} more
                  </li>
                )}
              </ul>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
