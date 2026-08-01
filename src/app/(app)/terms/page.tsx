export const metadata = {
  title: "Terms of Service — Serika",
  description: "The terms and conditions for using Serika.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            Legal
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Terms of Service
          </h1>
          <p className="text-sm text-white/60">Last updated: August 2026</p>
        </div>
      </section>

      <div className="space-y-8 text-sm leading-7 text-white/70">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using Serika, you agree to these Terms of
            Service. If you do not agree, please do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">2. Description of Service</h2>
          <p>
            Serika provides a lossless music streaming platform that allows
            listeners to stream music and artists to upload and monetize their
            work. The service is provided on an &quot;as is&quot; and &quot;as
            available&quot; basis.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">3. User Accounts</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>You must provide accurate registration information.</li>
            <li>You are responsible for keeping your password secure.</li>
            <li>You may not share your account with others.</li>
            <li>One person may not create multiple accounts to abuse the service.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">4. Acceptable Use</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Do not upload content you do not own or have rights to.</li>
            <li>Do not attempt to scrape, download, or redistribute streams outside the platform.</li>
            <li>Do not use bots or automation to inflate play counts.</li>
            <li>Do not harass other users or post abusive content.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">5. Artist Content</h2>
          <p>
            Artists retain ownership of their uploaded music. By uploading, you
            grant Serika a license to stream and store your content for the
            purpose of operating the service. You are responsible for ensuring
            you have the rights to distribute your uploads.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">6. Monetization</h2>
          <p>
            Artist monetization is based on stream counts and the platform&apos;s
            revenue model. Payout details and thresholds may change over time.
            Serika reserves the right to adjust the monetization model with
            reasonable notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">7. Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these terms. You
            may delete your account at any time through your settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">8. Limitation of Liability</h2>
          <p>
            Serika is not liable for indirect, incidental, or consequential
            damages arising from use of the service. Our total liability is
            limited to the amount you have paid us, if any.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">9. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of Serika
            after changes constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">10. Contact</h2>
          <p>
            Questions about these terms? Reach out via the{" "}
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
