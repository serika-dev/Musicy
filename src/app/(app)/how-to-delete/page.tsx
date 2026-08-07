import { UserX, ShieldCheck, DatabaseZap, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "How to Delete Your Account — Serika",
  description: "Guide to account deletion for users and instance admins.",
};

export default function HowToDeletePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(239,68,68,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            Account
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            How to Delete Your Account
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70">
            Musicy is self-hosted, so account deletion depends on your role on
            the instance. Pick the scenario that applies to you below.
          </p>
        </div>
      </section>

      <div className="space-y-6">
        {/* Regular user */}
        <section className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <UserX className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              I&apos;m a regular user
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/70">
            <p>
              If you registered on a Musicy instance that someone else hosts,
              you can&apos;t delete your own account from the settings page.
              Contact the instance admin and ask them to remove your account.
            </p>
            <p>
              The admin can delete your account from{" "}
              <span className="font-semibold text-white">
                Admin &rarr; Users
              </span>{" "}
              in the dashboard. This permanently removes:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Your profile, username and email</li>
              <li>All your playlists and liked songs</li>
              <li>Your follow relationships and listening history</li>
              <li>Your uploaded tracks (if you were an artist)</li>
            </ul>
            <p>
              Deletion is immediate and irreversible. The admin will see a
              confirmation prompt before the account is removed.
            </p>
          </div>
        </section>

        {/* Admin deleting a user */}
        <section className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              I&apos;m an admin deleting a user
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/70">
            <p>
              Go to{" "}
              <span className="font-semibold text-white">
                Admin &rarr; Users
              </span>{" "}
              in your dashboard, find the user you want to remove, and click the
              trash icon next to their row. You&apos;ll be asked to confirm
              before the account is permanently deleted.
            </p>
            <p>
              All related data — playlists, liked tracks, follows, play history
              and uploaded tracks — is cascaded and removed automatically by the
              database.
            </p>
          </div>
        </section>

        {/* Admin deleting themselves */}
        <section className="rounded-lg border border-red-500/30 bg-red-950/20 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-red-500/30 bg-black/30 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              I&apos;m an admin and want to delete my own account
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/70">
            <p>
              The admin panel blocks you from deleting your own account — this
              is intentional, to prevent locking yourself out of the instance
              with no way back in.
            </p>
            <p>
              To remove the admin account (or wipe all accounts and start
              fresh), you need to <strong className="text-white">reinstall
              the instance</strong>. This means dropping the database and
              re-running migrations and seed:
            </p>
            <div className="rounded-md border border-white/10 bg-black/40 p-4">
              <pre className="overflow-x-auto text-xs text-white/80"><code>{`# 1. Drop and recreate the database
npx prisma migrate reset --force

# 2. Re-seed (creates a fresh admin)
npm run db:seed

# 3. Restart the server
npm run build && npm start`}</code></pre>
            </div>
            <p className="text-red-300">
              This deletes <em>everything</em> — all users, playlists, tracks,
              uploads and settings. There is no undo. Back up your database
              first if you want to preserve any data.
            </p>
          </div>
        </section>

        {/* Full instance wipe */}
        <section className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              I want to wipe the entire instance
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/70">
            <p>
              If you want a completely clean slate — new database, new admin,
              no leftover data — the same <code className="text-white">prisma
              migrate reset</code> flow above applies. After resetting:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>The seed script creates a fresh admin account</li>
              <li>All previously uploaded audio files in B2 storage remain
                untouched — clean those up separately if needed</li>
              <li>Any existing API keys or mobile sessions are invalidated</li>
            </ul>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <h2 className="mb-3 text-2xl font-bold">Questions?</h2>
        <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
          If you&apos;re unsure about any step, reach out to the instance admin
          or check the contact page.
        </p>
        <a
          href="/contact"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Contact
        </a>
      </section>
    </div>
  );
}
