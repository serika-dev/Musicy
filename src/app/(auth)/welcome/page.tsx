"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioWaveform,
  Check,
  ChevronLeft,
  Gauge,
  Loader2,
  Search,
  Sparkles,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArtistImage } from "@/components/artist-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import type { UserSettings } from "@/lib/settings-defaults";
import { cn } from "@/lib/utils";

type Step = "welcome" | "genres" | "artists" | "quality" | "done";
const STEPS: Step[] = ["welcome", "genres", "artists", "quality", "done"];

interface SuggestedArtist {
  id: string;
  name: string;
  imageUrl?: string | null;
  verified: boolean;
  _count: { followers: number; tracks: number };
}

const QUALITY_OPTIONS: {
  value: UserSettings["audioQuality"];
  title: string;
  body: string;
  icon: typeof Wifi;
  badge?: string;
}[] = [
  {
    value: "lossless",
    title: "Lossless",
    body: "Studio FLAC, bit for bit. Best on Wi-Fi and good headphones.",
    icon: AudioWaveform,
    badge: "Recommended",
  },
  {
    value: "auto",
    title: "Automatic",
    body: "Adapts to your connection so playback never stalls.",
    icon: Sparkles,
  },
  {
    value: "high",
    title: "High",
    body: "High-bitrate lossy. Sounds great, uses about a third of the data.",
    icon: Gauge,
  },
  {
    value: "low",
    title: "Data saver",
    body: "Light on mobile data, still pleasant for casual listening.",
    icon: Wifi,
  },
];

const MIN_ARTISTS = 3;

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("welcome");
  const [genres, setGenres] = useState<string[]>([]);
  const [artistIds, setArtistIds] = useState<string[]>([]);
  const [pickedArtists, setPickedArtists] = useState<
    Record<string, SuggestedArtist>
  >({});
  const [quality, setQuality] =
    useState<UserSettings["audioQuality"]>("lossless");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated")
      router.replace("/login?callbackUrl=/welcome");
  }, [status, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const genresQuery = useQuery<{ genres: { name: string; count: number }[] }>({
    queryKey: ["onboarding", "genres"],
    queryFn: async () => {
      const r = await fetch("/api/genres");
      if (!r.ok) throw new Error("Failed to load genres");
      return r.json();
    },
    enabled: status === "authenticated",
    staleTime: 5 * 60_000,
  });

  const artistsQuery = useQuery<{ artists: SuggestedArtist[] }>({
    queryKey: ["onboarding", "artists", genres.join(","), debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "36" });
      if (genres.length) params.set("genres", genres.join(","));
      if (debouncedSearch) params.set("search", debouncedSearch);
      const r = await fetch(`/api/onboarding/artists?${params}`);
      if (!r.ok) throw new Error("Failed to load artists");
      return r.json();
    },
    enabled: status === "authenticated" && step === "artists",
    placeholderData: (prev) => prev,
  });

  const suggested = artistsQuery.data?.artists ?? [];
  // A tiny catalogue shouldn't be able to block the flow, but a narrow search
  // shouldn't lower the bar either — remember the most artists ever offered.
  const [offeredCount, setOfferedCount] = useState(0);
  useEffect(() => {
    setOfferedCount((c) => Math.max(c, suggested.length));
  }, [suggested.length]);
  const required = Math.min(
    MIN_ARTISTS,
    Math.max(offeredCount, artistIds.length),
  );
  const firstName = session?.user?.name?.split(" ")[0];
  const stepIndex = STEPS.indexOf(step);

  const toggleGenre = (name: string) =>
    setGenres((g) =>
      g.includes(name) ? g.filter((x) => x !== name) : [...g, name],
    );

  const toggleArtist = (artist: SuggestedArtist) => {
    setArtistIds((ids) =>
      ids.includes(artist.id)
        ? ids.filter((x) => x !== artist.id)
        : [...ids, artist.id],
    );
    setPickedArtists((m) => ({ ...m, [artist.id]: artist }));
  };

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      const r = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          skip
            ? { genres: [], artistIds: [] }
            : { genres, artistIds, audioQuality: quality },
        ),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (data.settings)
        queryClient.setQueryData(["user", "settings"], data.settings);
      queryClient.invalidateQueries({ queryKey: ["user", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["followed-artists"] });
      queryClient.invalidateQueries({ queryKey: ["user-feed"] });
      if (skip) router.replace("/");
      else setStep("done");
    } catch {
      toast.error("Couldn't save your picks. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === "quality") {
      finish();
      return;
    }
    if (step === "done") {
      router.replace("/");
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  };

  const back = () => {
    if (stepIndex > 0 && step !== "done") setStep(STEPS[stepIndex - 1]);
  };

  const canContinue =
    step !== "artists" ||
    (!artistsQuery.isLoading && artistIds.length >= required);

  const primaryLabel = useMemo(() => {
    switch (step) {
      case "welcome":
        return "Get started";
      case "genres":
        return genres.length === 0 ? "Skip for now" : "Continue";
      case "artists":
        return artistIds.length >= required
          ? "Continue"
          : `Pick ${required - artistIds.length} more`;
      case "quality":
        return "Finish";
      case "done":
        return "Start listening";
    }
  }, [step, genres.length, artistIds.length, required]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[60vh] bg-[radial-gradient(70%_60%_at_50%_0%,hsl(var(--primary)/0.28),transparent_70%)]"
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="flex w-20 items-center">
          {stepIndex > 0 && step !== "done" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={back}
              aria-label="Back"
              className="-ml-2 rounded-full"
            >
              <ChevronLeft className="!size-6" />
            </Button>
          ) : (
            <Logo size="sm" />
          )}
        </div>
        {/* Progress: one segment per question step */}
        <div
          className="flex flex-1 items-center justify-center gap-1.5"
          aria-hidden
        >
          {STEPS.slice(1, -1).map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1 w-10 rounded-full transition-colors duration-300",
                i < stepIndex ? "bg-foreground" : "bg-foreground/20",
              )}
            />
          ))}
        </div>
        <div className="flex w-20 justify-end">
          {step !== "done" && (
            <button
              type="button"
              onClick={() => finish(true)}
              disabled={saving}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip
            </button>
          )}
        </div>
      </header>

      {/* Step body */}
      <main
        key={step}
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-36 pt-8 animate-enter md:pt-14"
      >
        {step === "welcome" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-8 flex -space-x-3">
              {[
                "from-indigo-500 to-fuchsia-400",
                "from-emerald-500 to-cyan-300",
                "from-amber-500 to-rose-400",
              ].map((g, i) => (
                <span
                  key={g}
                  className={cn(
                    "h-16 w-16 rounded-full border-4 border-background bg-gradient-to-br shadow-xl animate-float",
                    g,
                  )}
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              ))}
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Welcome{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
              Tell us a little about what you love and we&apos;ll shape your
              home, mixes and recommendations around it. It takes about 30
              seconds.
            </p>
          </div>
        )}

        {step === "genres" && (
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              What do you listen to?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Pick as many as you like.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {genresQuery.isLoading &&
                [
                  "a",
                  "b",
                  "c",
                  "d",
                  "e",
                  "f",
                  "g",
                  "h",
                  "i",
                  "j",
                  "k",
                  "l",
                ].map((k) => (
                  <span
                    key={k}
                    className="h-11 w-28 animate-pulse rounded-full bg-secondary"
                  />
                ))}
              {genresQuery.data?.genres.map((g) => {
                const on = genres.includes(g.name);
                return (
                  <button
                    key={g.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGenre(g.name)}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition-all active:scale-95",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-secondary/60 hover:border-foreground/40",
                    )}
                  >
                    {on && <Check className="h-4 w-4" />}
                    {g.name}
                  </button>
                );
              })}
              {genresQuery.data && genresQuery.data.genres.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No genres yet — you can skip this step.
                </p>
              )}
            </div>
          </div>
        )}

        {step === "artists" && (
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Choose {required > 1 ? `${required} or more` : "some"} artists you
              like.
            </h1>
            <p className="mt-2 text-muted-foreground">
              We&apos;ll follow them for you and use them to build your mixes.
            </p>
            <div className="relative mt-6">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search artists"
                aria-label="Search artists"
                className="h-12 rounded-full border-transparent bg-secondary pl-12 text-[15px] focus-visible:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
              {artistsQuery.isLoading &&
                ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
                  <div key={k} className="space-y-2">
                    <div className="aspect-square animate-pulse rounded-full bg-secondary" />
                    <div className="mx-auto h-3 w-2/3 animate-pulse rounded bg-secondary" />
                  </div>
                ))}
              {suggested.map((a) => {
                const on = artistIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleArtist(a)}
                    className="group flex flex-col items-center text-center"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "relative block aspect-square w-full overflow-hidden rounded-full bg-secondary ring-offset-4 ring-offset-background transition-all duration-200 group-active:scale-95",
                        on
                          ? "ring-2 ring-foreground"
                          : "group-hover:scale-[1.03]",
                      )}
                    >
                      <ArtistImage
                        artistId={a.id}
                        artistImageUrl={a.imageUrl ?? undefined}
                        artistName={a.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center bg-secondary text-2xl font-bold text-muted-foreground"
                      />
                      <span
                        className={cn(
                          "absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity",
                          on ? "opacity-100" : "opacity-0",
                        )}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background animate-pop-in">
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                      </span>
                    </span>
                    <span className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-tight">
                      {a.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {!artistsQuery.isLoading && suggested.length === 0 && (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                {debouncedSearch
                  ? `No artists match “${debouncedSearch}”.`
                  : "No artists to suggest yet."}
              </p>
            )}
          </div>
        )}

        {step === "quality" && (
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              How should it sound?
            </h1>
            <p className="mt-2 text-muted-foreground">
              You can change this any time in Settings.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {QUALITY_OPTIONS.map((q) => {
                const on = quality === q.value;
                return (
                  <button
                    key={q.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setQuality(q.value)}
                    className={cn(
                      "relative flex items-start gap-4 rounded-xl border p-5 text-left transition-all active:scale-[0.98]",
                      on
                        ? "border-foreground bg-foreground/[0.06]"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                        on
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      <q.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-bold">
                        {q.title}
                        {q.badge && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {q.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {q.body}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-8 flex -space-x-4">
              {artistIds.slice(0, 5).map((id, i) => {
                const a = pickedArtists[id];
                return (
                  <span
                    key={id}
                    className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-xl animate-pop-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {a && (
                      <ArtistImage
                        artistId={a.id}
                        artistImageUrl={a.imageUrl ?? undefined}
                        artistName={a.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center bg-secondary"
                      />
                    )}
                  </span>
                );
              })}
              {artistIds.length === 0 && (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl animate-pop-in">
                  <Check className="h-9 w-9" strokeWidth={3} />
                </span>
              )}
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              You&apos;re all set.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
              {artistIds.length > 0
                ? `Following ${artistIds.length} ${artistIds.length === 1 ? "artist" : "artists"}. Your home and daily mixes are tuning themselves now.`
                : "Your home will learn from what you play. Like songs and follow artists to shape it."}
            </p>
          </div>
        )}
      </main>

      {/* Sticky action */}
      <footer className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-5">
          {step === "artists" && artistIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {artistIds.length} selected
            </p>
          )}
          <Button
            onClick={next}
            disabled={!canContinue || saving}
            className="h-12 w-full max-w-xs rounded-full bg-foreground text-base font-bold text-background hover:scale-[1.03] hover:bg-foreground disabled:bg-foreground/30 disabled:text-background/80"
          >
            {saving ? (
              <Loader2 className="!size-5 animate-spin" />
            ) : (
              primaryLabel
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
