export const metadata = {
  title: "Privacy Policy — Serika",
  description: "How Serika handles your data and privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            Legal
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-white/60">Last updated: August 2026</p>
        </div>
      </section>

      <div className="space-y-8 text-sm leading-7 text-white/70">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">1. Overview</h2>
          <p>
            Serika is a lossless music streaming platform. We are committed to
            protecting your privacy and minimizing the data we collect. This
            policy explains what information we gather, how we use it, and the
            choices you have.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">2. Data We Collect</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white">Account data:</strong> username,
              email address, and password hash when you register.
            </li>
            <li>
              <strong className="text-white">Listening data:</strong> tracks
              played, likes, playlists, and follow relationships. This is used to
              provide core features and improve recommendations.
            </li>
            <li>
              <strong className="text-white">Usage data:</strong> basic
              analytics such as page views and error reports to keep the service
              running smoothly.
            </li>
            <li>
              <strong className="text-white">Artist uploads:</strong> audio
              files and metadata you submit when you join as an artist.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">3. How We Use Your Data</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>To provide the streaming service and your personal library.</li>
            <li>To generate daily mixes and recommendations.</li>
            <li>To pay artists based on stream counts.</li>
            <li>To diagnose bugs and improve performance.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">4. What We Don&apos;t Do</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>We do not sell your personal data to third parties.</li>
            <li>We do not run targeted advertising or ad profiling.</li>
            <li>We do not track you across other websites or apps.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">5. Data Storage</h2>
          <p>
            Your data is stored on our servers and in secure object storage for
            audio files. Audio files are served via a CDN for performance. We use
            standard encryption and access controls to protect your information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">6. Your Rights</h2>
          <p>
            You can request a copy of your data or ask us to delete your account
            at any time. Contact us through the{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact page
            </a>{" "}
            to exercise these rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">7. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. The &quot;last
            updated&quot; date at the top reflects the most recent revision.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">8. Contact</h2>
          <p>
            Questions about privacy? Reach out via the{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
