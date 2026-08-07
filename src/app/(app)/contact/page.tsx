import { Mail, MessageCircle, Bug, Code } from "lucide-react";

export const metadata = {
  title: "Contact — Serika",
  description: "Get in touch with the Serika team.",
};

const CHANNELS = [
  {
    icon: Mail,
    title: "Support",
    description: "Questions about Serika, account help, partnerships, or anything else.",
    label: "support@serika.dev",
    href: "mailto:support@serika.dev",
  },
  {
    icon: Bug,
    title: "Bug Reports",
    description: "Found something broken? Let us know so we can fix it.",
    label: "GitHub Issues",
    href: "https://github.com/serika-dev/Musicy/issues",
    external: true,
  },
  {
    icon: Code,
    title: "Developer Support",
    description: "API access, OAuth apps, and integration questions.",
    label: "/developers",
    href: "/developers",
  },
  {
    icon: MessageCircle,
    title: "Community",
    description: "Join the conversation and connect with other listeners.",
    label: "Serikacord",
    href: "https://serika.cc/serika",
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            Contact
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Get in touch
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70">
            We&apos;d love to hear from you. Pick the channel that best matches
            what you need.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CHANNELS.map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            target={channel.external ? "_blank" : undefined}
            rel={channel.external ? "noopener noreferrer" : undefined}
            className="group rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <channel.icon className="h-5 w-5" />
            </div>
            <h2 className="mb-2 text-lg font-bold">{channel.title}</h2>
            <p className="mb-3 text-sm leading-6 text-muted-foreground">
              {channel.description}
            </p>
            <span className="text-sm font-semibold text-primary group-hover:underline">
              {channel.label}
            </span>
          </a>
        ))}
      </section>
    </div>
  );
}
