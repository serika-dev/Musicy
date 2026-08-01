import { LifeBuoy, Music, Download, User, CreditCard, Bug } from "lucide-react";

export const metadata = {
  title: "Support — Serika",
  description: "Find help and answers for common questions about Serika.",
};

const TOPICS = [
  {
    icon: Music,
    title: "Playing Music",
    questions: [
      "How do I play and queue tracks?",
      "Why is a song not playing or loading slowly?",
      "How do synced lyrics work?",
    ],
  },
  {
    icon: Download,
    title: "Downloads & Offline",
    questions: [
      "How do I download tracks for offline listening?",
      "Where are my downloads stored?",
      "Can I use downloads on Android Auto?",
    ],
  },
  {
    icon: User,
    title: "Account & Profile",
    questions: [
      "How do I create an account?",
      "How do I request artist access?",
      "Can I change my username?",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Monetization",
    questions: [
      "How does artist monetization work?",
      "When do I get paid for my streams?",
      "Is Serika free to use?",
    ],
  },
];

const RESOURCES = [
  {
    icon: Bug,
    title: "Report a Bug",
    description: "Found a bug? File it on GitHub so we can investigate.",
    label: "GitHub Issues",
    href: "https://github.com/serika-dev/Musicy/issues",
    external: true,
  },
  {
    icon: LifeBuoy,
    title: "Contact Us",
    description: "Can't find what you're looking for? Send us a message.",
    label: "Contact page",
    href: "/contact",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-6 py-12 shadow-2xl sm:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            Support
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            How can we help?
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70">
            Browse common questions below or reach out directly if you need more
            help.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <div
            key={topic.title}
            className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <topic.icon className="h-5 w-5" />
            </div>
            <h2 className="mb-3 text-lg font-bold">{topic.title}</h2>
            <ul className="space-y-2">
              {topic.questions.map((q) => (
                <li
                  key={q}
                  className="text-sm leading-6 text-muted-foreground"
                >
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {RESOURCES.map((resource) => (
          <a
            key={resource.title}
            href={resource.href}
            target={resource.external ? "_blank" : undefined}
            rel={resource.external ? "noopener noreferrer" : undefined}
            className="group rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30 text-primary">
              <resource.icon className="h-5 w-5" />
            </div>
            <h2 className="mb-2 text-lg font-bold">{resource.title}</h2>
            <p className="mb-3 text-sm leading-6 text-muted-foreground">
              {resource.description}
            </p>
            <span className="text-sm font-semibold text-primary group-hover:underline">
              {resource.label}
            </span>
          </a>
        ))}
      </section>
    </div>
  );
}
