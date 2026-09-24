import type { Metadata } from "next";
import Link from "next/link";
import { DevelopersHeader } from "@/components/developers/developers-header";
import { getSystemSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Musicy for Developers",
  description:
    "Build on Musicy: a REST Web API for tracks, albums, artists, playlists and listening, plus oEmbed and an embeddable player.",
};

export default async function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isApiAccessEnabled =
    (await getSystemSetting("PUBLIC_API_ACCESS", "true")) === "true";

  if (!isApiAccessEnabled) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center text-foreground">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-card p-8">
          <p className="font-mono text-sm text-muted-foreground">403</p>
          <h1 className="text-xl font-bold">The developer API is turned off</h1>
          <p className="text-sm text-muted-foreground">
            An administrator has disabled API keys and the developer portal on
            this instance.
          </p>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background"
          >
            Back to Musicy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DevelopersHeader />
      <main>{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            <span className="font-semibold text-foreground">Musicy</span> for
            Developers
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/developers/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link
              href="/developers/playground"
              className="hover:text-foreground"
            >
              Playground
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
