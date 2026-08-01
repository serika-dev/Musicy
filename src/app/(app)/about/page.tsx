import { Music2, Heart, Shield, Zap } from "lucide-react";

export const metadata = {
  title: "About — Serika",
  description: "Learn about Serika, a lossless music streaming platform.",
};

const VALUES = [
  {
    icon: Music2,
    title: "Lossless First",
    description:
      "Every track is streamed in FLAC quality. No lossy compression, no compromises.",
  },
  {
    icon: Heart,
    title: "Artist-Centric",
    description:
      "Fair monetization and direct support for the artists you listen to.",
  },
  {
    icon: Shield,
    title: "Privacy Respected",
    description:
      "No invasive tracking, no ad profiling. Your listening habits stay yours.",
  },
  {
    icon: Zap,
    title: "Open & Extensible",
    description:
      "A public API and developer platform so anyone can build on top of Serika.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            About
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Music, uncompromised.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70">
            Serika is a lossless music streaming platform built for listeners who
            care about audio quality and artists who deserve fair compensation.
            Stream in FLAC, follow synced lyrics in real time, and support the
            creators you love — all without ads or tracking.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {VALUES.map((value) => (
          <div
            key={value.title}
            className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <value.icon className="h-5 w-5" />
            </div>
            <h2 className="mb-2 text-lg font-bold">{value.title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {value.description}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <h2 className="mb-3 text-2xl font-bold">Want to join as an artist?</h2>
        <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
          Upload your music, reach listeners worldwide, and earn from every stream.
        </p>
        <a
          href="/join-artist"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get started
        </a>
      </section>
    </div>
  );
}
