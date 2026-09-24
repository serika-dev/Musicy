import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { DocsShell } from "@/components/developers/docs-shell";
import {
  C,
  Callout,
  DocHeader,
  DocSection,
} from "@/components/developers/docs-ui";
import { getAppUrl } from "@/lib/seo";

export const metadata = { title: "Introduction · Musicy Developers" };

const TOC = [
  { id: "what-you-can-build", title: "What you can build" },
  { id: "quickstart", title: "Quickstart" },
  { id: "play-audio", title: "Play audio" },
  { id: "next-steps", title: "Next steps" },
];

export default function DocsIntro() {
  const base = getAppUrl();
  return (
    <DocsShell toc={TOC}>
      <DocHeader
        eyebrow="Getting started"
        title="Introduction"
        lead={
          <>
            Musicy exposes the same API its own web and mobile apps use.
            Everything is JSON over HTTPS, authenticated with a personal API
            key.
          </>
        }
      />

      <div className="space-y-12">
        <DocSection id="what-you-can-build" title="What you can build">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [
                "Now-playing widgets and bots",
                "Read a listener's recent plays, likes and follows.",
              ],
              [
                "Library tools",
                "Create playlists, add tracks, like songs and follow artists.",
              ],
              [
                "Catalogue browsers",
                "Search and page through tracks, albums and artists.",
              ],
              [
                "Players",
                "Stream audio at lossless, high, medium or low quality.",
              ],
            ].map(([t, d]) => (
              <li key={t} className="rounded-lg p-4 ring-1 ring-border">
                <p className="font-medium text-foreground">{t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ul>
          <p>
            Just want to show music on a web page? You don&apos;t need a key:
            use the{" "}
            <Link
              href="/developers/docs/iframe-sdk"
              className="text-primary hover:underline"
            >
              embed player
            </Link>{" "}
            or{" "}
            <Link
              href="/developers/docs/oembed"
              className="text-primary hover:underline"
            >
              oEmbed
            </Link>
            .
          </p>
        </DocSection>

        <DocSection id="quickstart" title="Quickstart">
          <ol className="space-y-8">
            <li className="space-y-3">
              <p className="font-medium text-foreground">
                1. Create an API key
              </p>
              <p>
                Sign in and open{" "}
                <Link
                  href="/developers/dashboard"
                  className="text-primary hover:underline"
                >
                  API keys
                </Link>
                . Give the key a name you&apos;ll recognise, then copy it and
                keep it somewhere safe, such as an environment variable.
              </p>
              <CodeBlock
                title="Shell"
                tabs={[
                  {
                    label: "Shell",
                    code: `export MUSICY_API_KEY="paste-your-key-here"`,
                  },
                ]}
              />
            </li>
            <li className="space-y-3">
              <p className="font-medium text-foreground">
                2. Make your first request
              </p>
              <p>
                Ask who the key belongs to. Every authenticated request sends
                the key as a Bearer token in the <C>Authorization</C> header.
              </p>
              <CodeBlock
                tabs={[
                  {
                    label: "cURL",
                    code: `curl "${base}/api/user/profile" \\\n  -H "Authorization: Bearer $MUSICY_API_KEY"`,
                  },
                  {
                    label: "JavaScript",
                    code: `const res = await fetch("${base}/api/user/profile", {\n  headers: { Authorization: \`Bearer \${process.env.MUSICY_API_KEY}\` },\n});\nconsole.log(await res.json());`,
                  },
                  {
                    label: "Python",
                    code: `import os, requests\n\nres = requests.get(\n    "${base}/api/user/profile",\n    headers={"Authorization": f"Bearer {os.environ['MUSICY_API_KEY']}"},\n)\nprint(res.json())`,
                  },
                ]}
              />
              <CodeBlock
                title="Response"
                tabs={[
                  {
                    label: "Response",
                    code: `{\n  "id": "cm4usr01",\n  "username": "alex",\n  "displayName": "Alex",\n  "isPremium": false,\n  "role": "USER"\n}`,
                  },
                ]}
              />
            </li>
            <li className="space-y-3">
              <p className="font-medium text-foreground">3. Find some music</p>
              <p>Search needs no key at all:</p>
              <CodeBlock
                title="Shell"
                tabs={[
                  {
                    label: "Shell",
                    code: `curl "${base}/api/search?q=midnight&type=track&limit=5"`,
                  },
                ]}
              />
            </li>
          </ol>
        </DocSection>

        <DocSection id="play-audio" title="Play audio">
          <p>
            <C>GET /api/tracks/{"{id}"}/stream?quality=high</C> redirects to the
            audio file for the tier you ask for. Public tracks stream without a
            key, so a plain audio element works:
          </p>
          <CodeBlock
            title="HTML"
            tabs={[
              {
                label: "HTML",
                code: `<audio controls src="${base}/api/tracks/cm4trk01/stream?quality=high"></audio>`,
              },
            ]}
          />
          <Callout kind="tip" title="Private tracks">
            Browsers can&apos;t attach an <C>Authorization</C> header to{" "}
            <C>&lt;audio&gt;</C>. For private tracks, call the stream endpoint
            from your server without following the redirect, and give the player
            the <C>Location</C> URL.
          </Callout>
        </DocSection>

        <DocSection id="next-steps" title="Next steps">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [
                "/developers/docs/authentication",
                "Authentication",
                "Keys, sign-in for apps, and errors.",
              ],
              [
                "/developers/docs/web-api",
                "Conventions",
                "Pagination, errors and audio quality tiers.",
              ],
              [
                "/developers/docs/api/tracks",
                "API reference",
                "Every endpoint with examples.",
              ],
              [
                "/developers/playground",
                "Playground",
                "Send real requests from your browser.",
              ],
            ].map(([href, t, d]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg p-4 ring-1 ring-border transition-colors hover:bg-foreground/[0.04] hover:ring-foreground/25"
              >
                <p className="font-medium text-foreground">{t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </Link>
            ))}
          </div>
        </DocSection>
      </div>
    </DocsShell>
  );
}
