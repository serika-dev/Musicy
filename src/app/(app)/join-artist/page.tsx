import { Upload, DollarSign, BarChart3, Globe } from "lucide-react";

export const metadata = {
  title: "Join as an Artist — Serika",
  description: "Upload your music to Serika and reach listeners worldwide.",
};

const BENEFITS = [
  {
    icon: Upload,
    title: "Upload Your Music",
    description:
      "Upload lossless tracks and albums. We handle encoding and delivery.",
  },
  {
    icon: DollarSign,
    title: "Earn From Every Stream",
    description:
      "Fair, transparent monetization. You keep control of your music and your revenue.",
  },
  {
    icon: BarChart3,
    title: "Track Your Growth",
    description:
      "Detailed analytics on plays, listeners, and geographic reach.",
  },
  {
    icon: Globe,
    title: "Reach a Global Audience",
    description:
      "Your music available to listeners everywhere, on web and mobile.",
  },
];

const STEPS = [
  "Create a Serika account or sign in",
  "Request artist access from your profile settings",
  "Upload your tracks in FLAC or WAV format",
  "Your music goes live — start earning from every stream",
];

export default function JoinArtistPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            For Artists
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Join Serika as an artist
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70">
            Upload your music in lossless quality, reach listeners around the
            world, and earn fair revenue from every stream. No label required.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <benefit.icon className="h-5 w-5" />
            </div>
            <h2 className="mb-2 text-lg font-bold">{benefit.title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {benefit.description}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h2 className="mb-6 text-2xl font-bold">How it works</h2>
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-sm leading-6 text-white/80">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <h2 className="mb-3 text-2xl font-bold">Ready to share your music?</h2>
        <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
          Create an account today and request artist access to get started.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create account
          </a>
          <a
            href="/settings"
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            Request artist access
          </a>
        </div>
      </section>
    </div>
  );
}
