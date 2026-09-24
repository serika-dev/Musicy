import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsShell } from "@/components/developers/docs-shell";
import { DocHeader } from "@/components/developers/docs-ui";
import { EndpointCard } from "@/components/developers/endpoint-card";
import { API_GROUPS } from "@/lib/developer-docs";
import { getAppUrl } from "@/lib/seo";

export function generateStaticParams() {
  return API_GROUPS.map((g) => ({ group: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ group: string }>;
}): Promise<Metadata> {
  const { group } = await params;
  const g = API_GROUPS.find((x) => x.slug === group);
  return {
    title: g
      ? `${g.title} API · Musicy Developers`
      : "API reference · Musicy Developers",
  };
}

export default async function ApiGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const index = API_GROUPS.findIndex((g) => g.slug === group);
  if (index === -1) notFound();
  const g = API_GROUPS[index];
  const prev = API_GROUPS[index - 1];
  const next = API_GROUPS[index + 1];
  const base = getAppUrl();

  return (
    <DocsShell toc={g.endpoints.map((e) => ({ id: e.id, title: e.title }))}>
      <DocHeader eyebrow="API reference" title={g.title} lead={g.description} />
      <div className="space-y-10">
        {g.endpoints.map((e) => (
          <EndpointCard key={e.id} endpoint={e} baseUrl={base} />
        ))}
      </div>
      <nav
        className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
        aria-label="More reference"
      >
        {prev ? (
          <Link
            href={`/developers/docs/api/${prev.slug}`}
            className="rounded-lg p-4 ring-1 ring-border transition-colors hover:ring-foreground/25"
          >
            <span className="text-xs text-muted-foreground">Previous</span>
            <span className="block font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/developers/docs/api/${next.slug}`}
            className="rounded-lg p-4 text-right ring-1 ring-border transition-colors hover:ring-foreground/25"
          >
            <span className="text-xs text-muted-foreground">Next</span>
            <span className="block font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </DocsShell>
  );
}
