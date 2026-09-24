import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { DocsShell } from "@/components/developers/docs-shell";
import {
  AuthBadge,
  C,
  Callout,
  DocHeader,
  DocSection,
} from "@/components/developers/docs-ui";
import { getAppUrl } from "@/lib/seo";

export const metadata = { title: "Authentication · Musicy Developers" };

const TOC = [
  { id: "api-keys", title: "API keys" },
  { id: "sending-the-key", title: "Sending the key" },
  { id: "access-levels", title: "Access levels" },
  { id: "sign-in-for-apps", title: "Signing in from an app" },
  { id: "errors", title: "Auth errors" },
];

export default function AuthenticationDocs() {
  const base = getAppUrl();
  return (
    <DocsShell toc={TOC}>
      <DocHeader
        eyebrow="Getting started"
        title="Authentication"
        lead="Musicy uses personal API keys. A key acts as your account, so treat it like a password."
      />

      <div className="space-y-12">
        <DocSection id="api-keys" title="API keys">
          <p>
            Create and revoke keys on the{" "}
            <Link
              href="/developers/dashboard"
              className="text-primary hover:underline"
            >
              API keys
            </Link>{" "}
            page. Each key has a name so you can tell integrations apart, and
            records when it was last used.
          </p>
          <Callout kind="warning" title="Keep keys on the server">
            A key can read and change everything in your library. Don&apos;t
            ship it in browser JavaScript or a public repository. If one leaks,
            revoke it and create a new one.
          </Callout>
        </DocSection>

        <DocSection id="sending-the-key" title="Sending the key">
          <p>
            Send the key as a Bearer token in the <C>Authorization</C> header on
            every request that needs one.
          </p>
          <CodeBlock
            title="HTTP"
            tabs={[
              {
                label: "HTTP",
                code: `GET /api/user/liked-songs HTTP/1.1\nHost: ${base.replace(/^https?:\/\//, "")}\nAuthorization: Bearer 3f6c2e1a-…`,
              },
            ]}
          />
        </DocSection>

        <DocSection id="access-levels" title="Access levels">
          <p>
            Each endpoint in the reference is tagged with one of three levels:
          </p>
          <div className="divide-y divide-border rounded-lg ring-1 ring-border">
            {(
              [
                [
                  "none",
                  "No credentials needed. Search, genres, album lists, lyrics and oEmbed.",
                ],
                [
                  "optional",
                  "Works without a key; with one you also get private or personal data (e.g. private playlists, follow status).",
                ],
                [
                  "required",
                  "Returns 401 without a key. Everything in the listener's library, and most catalogue reads.",
                ],
              ] as const
            ).map(([auth, text]) => (
              <div
                key={auth}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="w-32 shrink-0">
                  <AuthBadge auth={auth} />
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Requests from the Musicy web app itself use the browser session
            cookie instead of a key; the endpoints are the same.
          </p>
        </DocSection>

        <DocSection id="sign-in-for-apps" title="Signing in from an app">
          <p>
            Native apps that let a listener sign in with their Musicy email and
            password can exchange them for a key. The key is named{" "}
            <C>Mobile App</C> and reused on later sign-ins.
          </p>
          <CodeBlock
            tabs={[
              {
                label: "cURL",
                code: `curl -X POST "${base}/api/mobile/login" \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"alex@example.com","password":"…"}'`,
              },
            ]}
          />
          <CodeBlock
            title="Response"
            tabs={[
              {
                label: "Response",
                code: `{\n  "message": "Login successful",\n  "apiKey": "3f6c2e1a-…",\n  "user": { "id": "cm4usr01", "email": "alex@example.com", "username": "alex" }\n}`,
              },
            ]}
          />
          <Callout title="Only for apps you ship to your own listeners">
            Never ask people to type their Musicy password into a third-party
            service. For your own integrations, use a key from the dashboard.
          </Callout>
        </DocSection>

        <DocSection id="errors" title="Auth errors">
          <div className="divide-y divide-border rounded-lg ring-1 ring-border text-sm">
            {[
              [
                "401",
                "Missing, wrong or revoked key.",
                `{ "message": "Unauthorized" }`,
              ],
              [
                "403",
                "The key is valid but you don't own the resource (e.g. someone else's playlist).",
                `{ "message": "Access denied" }`,
              ],
            ].map(([code, text, body]) => (
              <div
                key={code}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,16rem)] sm:items-center"
              >
                <code className="font-mono font-semibold">{code}</code>
                <p className="text-muted-foreground">{text}</p>
                <code className="font-mono text-[12px] text-muted-foreground">
                  {body}
                </code>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            If an administrator turns off the developer API for the instance,
            every key stops working (401) until it&apos;s turned back on.
          </p>
        </DocSection>
      </div>
    </DocsShell>
  );
}
