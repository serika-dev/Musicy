import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { DocsShell } from "@/components/developers/docs-shell";
import {
  C,
  Callout,
  DocHeader,
  DocSection,
  MethodBadge,
} from "@/components/developers/docs-ui";
import { API_GROUPS } from "@/lib/developer-docs";
import { getAppUrl } from "@/lib/seo";

export const metadata = { title: "Conventions · Musicy Developers" };

const TOC = [
  { id: "base-url", title: "Base URL" },
  { id: "pagination", title: "Pagination" },
  { id: "errors", title: "Errors" },
  { id: "audio-quality", title: "Audio quality" },
  { id: "rate-limits", title: "Rate limits" },
  { id: "endpoints", title: "All endpoints" },
];

export default function ConventionsDocs() {
  const base = getAppUrl();
  return (
    <DocsShell toc={TOC}>
      <DocHeader
        eyebrow="Getting started"
        title="Conventions"
        lead="The rules every endpoint follows, so you only have to learn them once."
      />

      <div className="space-y-12">
        <DocSection id="base-url" title="Base URL">
          <CodeBlock
            title="Base URL"
            tabs={[{ label: "Base URL", code: `${base}/api` }]}
          />
          <p>
            Requests and responses are JSON (UTF-8). IDs are opaque strings;
            don&apos;t parse them. Timestamps are ISO 8601 in UTC. Durations are
            whole seconds.
          </p>
        </DocSection>

        <DocSection id="pagination" title="Pagination">
          <p>
            List endpoints take <C>limit</C> and <C>offset</C>, and return the
            page alongside <C>total</C> and, on most lists, <C>hasMore</C>.
          </p>
          <CodeBlock
            title="Response"
            tabs={[
              {
                label: "Response",
                code: `{\n  "tracks": [ … ],\n  "total": 132,\n  "limit": 20,\n  "offset": 40,\n  "hasMore": true\n}`,
              },
            ]}
          />
          <CodeBlock
            title="JavaScript"
            tabs={[
              {
                label: "JavaScript",
                code: `// Walk every page of liked songs\nlet offset = 0;\nconst all = [];\nwhile (true) {\n  const res = await fetch(\`${base}/api/user/liked-songs?limit=50&offset=\${offset}\`, {\n    headers: { Authorization: \`Bearer \${process.env.MUSICY_API_KEY}\` },\n  });\n  const page = await res.json();\n  all.push(...page.tracks);\n  if (!page.hasMore) break;\n  offset += page.limit;\n}`,
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Search is paginated per type: each of <C>tracks</C>, <C>artists</C>,{" "}
            <C>albums</C> and <C>playlists</C> carries its own <C>items</C>,{" "}
            <C>total</C>, <C>limit</C> and <C>offset</C>.
          </p>
        </DocSection>

        <DocSection id="errors" title="Errors">
          <p>
            Failures use standard HTTP status codes with a JSON body holding a
            human-readable <C>message</C> (a few older endpoints use{" "}
            <C>error</C>, so read both).
          </p>
          <div className="divide-y divide-border rounded-lg ring-1 ring-border text-sm">
            {[
              [
                "400",
                "Bad request",
                "A parameter is missing or invalid, or the action was already done (e.g. liking a liked song).",
              ],
              ["401", "Unauthorized", "No valid key or session."],
              [
                "403",
                "Forbidden",
                "You can't touch this resource, such as another listener's playlist.",
              ],
              [
                "404",
                "Not found",
                "The ID doesn't exist or isn't visible to you.",
              ],
              [
                "500",
                "Server error",
                "Something went wrong on our side. Retrying later is safe for GET requests.",
              ],
            ].map(([code, name, text]) => (
              <div
                key={code}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[4rem_8rem_minmax(0,1fr)] sm:gap-4"
              >
                <code className="font-mono font-semibold">{code}</code>
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection id="audio-quality" title="Audio quality">
          <p>
            Streaming and downloads take a <C>quality</C> parameter. Masters are
            kept as uploaded; smaller tiers are transcoded in the background.
          </p>
          <div className="divide-y divide-border rounded-lg ring-1 ring-border text-sm">
            {[
              ["lossless", "The original master, usually FLAC up to 24-bit."],
              ["high", "MP3, 320 kbps."],
              ["medium", "MP3, 192 kbps."],
              ["low", "MP3, 128 kbps. Easy on mobile data."],
              [
                "auto",
                "Same as high today. The default, and what unknown values fall back to.",
              ],
            ].map(([q, text]) => (
              <div
                key={q}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4"
              >
                <code className="font-mono font-semibold">{q}</code>
                <span className="text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection id="rate-limits" title="Rate limits">
          <Callout title="No hard limit today">
            There&apos;s currently no enforced rate limit, but keys are tied to
            accounts and abuse gets keys revoked. Cache catalogue data you read
            often, and back off when you see 5xx errors.
          </Callout>
        </DocSection>

        <DocSection id="endpoints" title="All endpoints">
          <div className="space-y-6">
            {API_GROUPS.map((g) => (
              <div key={g.slug}>
                <Link
                  href={`/developers/docs/api/${g.slug}`}
                  className="font-semibold hover:underline underline-offset-4"
                >
                  {g.title}
                </Link>
                <ul className="mt-2 divide-y divide-border rounded-lg ring-1 ring-border">
                  {g.endpoints.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/developers/docs/api/${g.slug}#${e.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-foreground/[0.04]"
                      >
                        <MethodBadge method={e.method} />
                        <code className="min-w-0 flex-1 truncate font-mono text-[13px]">
                          {e.path}
                        </code>
                        <span className="hidden text-muted-foreground sm:block">
                          {e.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DocSection>
      </div>
    </DocsShell>
  );
}
