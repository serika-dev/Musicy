import { CodeBlock } from "@/components/developers/code-block";
import { DocsShell } from "@/components/developers/docs-shell";
import {
  C,
  DocHeader,
  DocSection,
  ParamTable,
} from "@/components/developers/docs-ui";
import { getAppUrl } from "@/lib/seo";

export const metadata = { title: "oEmbed · Musicy Developers" };

const TOC = [
  { id: "endpoint", title: "Endpoint" },
  { id: "response", title: "Response" },
  { id: "discovery", title: "Discovery" },
  { id: "errors", title: "Errors" },
];

export default function OEmbedDocs() {
  const base = getAppUrl();
  return (
    <DocsShell toc={TOC}>
      <DocHeader
        eyebrow="Embeds"
        title="oEmbed"
        lead={
          <>
            Turn any Musicy link into a playable preview. Musicy implements the{" "}
            <a
              href="https://oembed.com"
              className="text-primary hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              oEmbed
            </a>{" "}
            standard, so most chat apps, CMSs and forums pick it up
            automatically.
          </>
        }
      />

      <div className="space-y-12">
        <DocSection id="endpoint" title="Endpoint">
          <CodeBlock
            tabs={[
              {
                label: "cURL",
                code: `curl "${base}/api/oembed?url=${encodeURIComponent(`${base}/tracks/cm4trk01`)}"`,
              },
            ]}
          />
          <ParamTable
            title="Query parameters"
            params={[
              {
                name: "url",
                type: "string",
                required: true,
                description:
                  "A Musicy link to a track, album, artist or playlist.",
              },
              {
                name: "format",
                type: "enum",
                description: "json (default) or xml.",
              },
              {
                name: "maxwidth",
                type: "integer",
                description: "Width in px, 200–1200. Default 456.",
              },
              {
                name: "maxheight",
                type: "integer",
                description: "Height in px, 80–600. Default 152.",
              },
            ]}
          />
        </DocSection>

        <DocSection id="response" title="Response">
          <CodeBlock
            title="Response"
            tabs={[
              {
                label: "JSON",
                code: `{\n  "version": "1.0",\n  "type": "rich",\n  "provider_name": "Serika Music",\n  "provider_url": "${base}",\n  "cache_age": 3600,\n  "title": "Midnight Drive",\n  "author_name": "Luna Vale",\n  "thumbnail_url": "https://…/cover.jpg",\n  "thumbnail_width": 300,\n  "thumbnail_height": 300,\n  "width": 456,\n  "height": 152,\n  "html": "<iframe src=\\"${base}/embed/tracks/cm4trk01\\" …></iframe>"\n}`,
              },
            ]}
          />
          <p>
            Put <C>html</C> into your page as-is. It&apos;s the same player
            described in{" "}
            <a
              href="/developers/docs/iframe-sdk"
              className="text-primary hover:underline"
            >
              Embed player & iFrame API
            </a>
            .
          </p>
        </DocSection>

        <DocSection id="discovery" title="Discovery">
          <p>
            Track, album, artist and playlist pages advertise their own oEmbed
            URL in the document head, so consumers that support discovery find
            it on their own:
          </p>
          <CodeBlock
            title="HTML"
            tabs={[
              {
                label: "HTML",
                code: `<!-- on ${base}/tracks/cm4trk01 -->\n<link rel="alternate" type="application/json+oembed"\n      href="${base}/api/oembed?url=${encodeURIComponent(`${base}/tracks/cm4trk01`)}" />\n<link rel="alternate" type="text/xml+oembed"\n      href="${base}/api/oembed?url=${encodeURIComponent(`${base}/tracks/cm4trk01`)}&format=xml" />`,
              },
            ]}
          />
        </DocSection>

        <DocSection id="errors" title="Errors">
          <div className="divide-y divide-border rounded-lg ring-1 ring-border text-sm">
            {[
              [
                "400",
                "url is missing, isn't a Musicy link, or points at an unsupported page.",
              ],
              ["404", "The track, album, artist or playlist doesn't exist."],
            ].map(([code, text]) => (
              <div
                key={code}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4"
              >
                <code className="font-mono font-semibold">{code}</code>
                <span className="text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </DocSection>
      </div>
    </DocsShell>
  );
}
