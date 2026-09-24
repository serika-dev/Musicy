"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileMusic,
  HardDrive,
  Loader2,
  Mic2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminStats {
  users: { total: number; new7d: number; admins: number; premium: number };
  tracks: {
    total: number;
    public: number;
    withoutLyrics: number;
    renditionsReady: number;
    renditionsFailed: number;
  };
  artists: { total: number; verified: number };
  albums: { total: number };
  playlists: { total: number };
  listening: { plays24h: number; plays7d: number; hours7d: number };
  series: {
    plays: { date: string; value: number }[];
    signups: { date: string; value: number }[];
  };
  topTracks: {
    id: string;
    title: string;
    plays: number;
    coverImageUrl?: string | null;
    artist: { id: string; name: string };
    album?: { coverImageUrl?: string | null } | null;
  }[];
}

interface HealthCheck {
  ok: boolean;
  ms: number;
  detail?: string;
}

interface OverviewUser {
  id: string;
  email: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  role?: string;
}

interface AdminOverviewProps {
  recentUsers: OverviewUser[];
  onNavigate: (tab: string) => void;
  onEditUser: (user: OverviewUser) => void;
}

const nf = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fmt = (n: number | undefined) =>
  n === undefined ? "—" : n < 10_000 ? n.toLocaleString("en") : nf.format(n);
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-raised p-5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && (
        <p className="mt-1 text-[13px] text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}

/**
 * Single-series daily column chart. Columns cap at 24px with a rounded data
 * end and square baseline; each column slot is its own hover target.
 */
function DailyColumns({
  title,
  total,
  data,
  unit,
}: {
  title: string;
  total: number;
  data: { date: string; value: number }[];
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  // Round the top tick to a clean number.
  const mag = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / mag) * mag;
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="rounded-xl bg-raised p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[13px] text-muted-foreground">Last 14 days</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{fmt(total)}</p>
      </div>

      <div className="relative mt-5 flex h-40 gap-3">
        {/* y ticks */}
        <div className="flex w-8 flex-col justify-between pb-5 text-right text-[11px] tabular-nums text-muted-foreground">
          <span>{fmt(top)}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          {/* recessive grid: top + baseline hairlines */}
          <div
            className="absolute inset-x-0 top-0 h-px bg-border"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-5 h-px bg-border"
            aria-hidden
          />
          <div className="absolute inset-x-0 top-0 bottom-5 flex items-end">
            {data.map((d, i) => (
              <div
                key={d.date}
                className="flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                aria-hidden
              >
                <div
                  className={cn(
                    "w-full max-w-6 rounded-t transition-opacity",
                    hover !== null && hover !== i
                      ? "opacity-40"
                      : "opacity-100",
                  )}
                  style={{
                    height: `${(d.value / top) * 100}%`,
                    minHeight: d.value > 0 ? 2 : 0,
                    marginInline: 1,
                    background: "hsl(var(--primary))",
                  }}
                />
              </div>
            ))}
          </div>
          {/* x labels: first and last only */}
          <div
            className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-muted-foreground"
            aria-hidden
          >
            <span>{data[0] && dayLabel(data[0].date)}</span>
            <span>
              {data.length > 0 && dayLabel(data[data.length - 1].date)}
            </span>
          </div>
          {active && hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs shadow-xl ring-1 ring-border"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <span className="text-muted-foreground">
                {dayLabel(active.date)}
              </span>{" "}
              <span className="font-semibold tabular-nums">
                {active.value.toLocaleString("en")} {unit}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Table view for assistive tech */}
      <table className="sr-only">
        <caption>{title}, last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthRow({
  icon: Icon,
  label,
  check,
  loading,
}: {
  icon: typeof Database;
  label: string;
  check?: HealthCheck;
  loading: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{label}</p>
        {check && (
          <p
            className="truncate text-[13px] text-muted-foreground"
            title={check.detail}
          >
            {check.ok ? `Responded in ${check.ms} ms` : check.detail}
          </p>
        )}
      </div>
      {loading || !check ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : check.ok ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-success">
          <CheckCircle2 className="h-4 w-4" /> Healthy
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-destructive">
          <XCircle className="h-4 w-4" /> Down
        </span>
      )}
    </div>
  );
}

export function AdminOverview({
  recentUsers,
  onNavigate,
  onEditUser,
}: AdminOverviewProps) {
  const stats = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const r = await fetch("/api/admin/stats");
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
    staleTime: 60_000,
  });
  const health = useQuery<{
    checkedAt: string;
    database: HealthCheck;
    storage: HealthCheck;
  }>({
    queryKey: ["admin", "health"],
    queryFn: async () => {
      const r = await fetch("/api/admin/health");
      if (!r.ok) throw new Error("Failed to run health checks");
      return r.json();
    },
    staleTime: 60_000,
  });

  const s = stats.data;
  const attention = s
    ? [
        {
          show: s.tracks.renditionsFailed > 0,
          icon: FileMusic,
          text: `${fmt(s.tracks.renditionsFailed)} tracks failed to transcode`,
          tab: "renditions",
        },
        {
          show:
            s.tracks.total -
              s.tracks.renditionsReady -
              s.tracks.renditionsFailed >
            0,
          icon: FileMusic,
          text: `${fmt(s.tracks.total - s.tracks.renditionsReady - s.tracks.renditionsFailed)} tracks without streaming renditions`,
          tab: "renditions",
        },
        {
          show: s.tracks.withoutLyrics > 0,
          icon: Mic2,
          text: `${fmt(s.tracks.withoutLyrics)} tracks have no lyrics`,
          tab: "tracks",
        },
      ].filter((a) => a.show)
    : [];

  return (
    <div className="space-y-4">
      {stats.isError && (
        <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Couldn&apos;t load platform stats.
          <Button
            size="sm"
            variant="ghost"
            onClick={() => stats.refetch()}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Listeners"
          value={fmt(s?.users.total)}
          detail={
            s
              ? `+${fmt(s.users.new7d)} this week · ${fmt(s.users.premium)} premium`
              : undefined
          }
        />
        <StatTile
          label="Plays, last 7 days"
          value={fmt(s?.listening.plays7d)}
          detail={
            s
              ? `${fmt(s.listening.plays24h)} today · ${s.listening.hours7d.toLocaleString("en")} h listened`
              : undefined
          }
        />
        <StatTile
          label="Tracks"
          value={fmt(s?.tracks.total)}
          detail={
            s
              ? `${fmt(s.tracks.public)} public · ${fmt(s.albums.total)} albums`
              : undefined
          }
        />
        <StatTile
          label="Artists"
          value={fmt(s?.artists.total)}
          detail={
            s
              ? `${fmt(s.artists.verified)} verified · ${fmt(s.playlists.total)} playlists`
              : undefined
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {s ? (
          <>
            <DailyColumns
              title="Plays per day"
              total={s.series.plays.reduce((a, d) => a + d.value, 0)}
              data={s.series.plays}
              unit="plays"
            />
            <DailyColumns
              title="New listeners per day"
              total={s.series.signups.reduce((a, d) => a + d.value, 0)}
              data={s.series.signups}
              unit="sign-ups"
            />
          </>
        ) : (
          [0, 1].map((i) => (
            <div
              key={i}
              className="h-[17.5rem] animate-pulse rounded-xl bg-raised"
            />
          ))
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Top tracks */}
        <div className="rounded-xl bg-raised p-5">
          <h3 className="text-sm font-semibold">Top tracks this week</h3>
          <ol className="mt-3 space-y-1">
            {s?.topTracks.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No plays yet this week.
              </li>
            )}
            {s?.topTracks.map((t, i) => {
              const art = t.coverImageUrl || t.album?.coverImageUrl;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-md py-1.5"
                >
                  <span className="w-4 text-right text-sm tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary">
                    {art && (
                      // biome-ignore lint/performance/noImgElement: remote artwork
                      <img
                        src={art}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.title}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {t.artist.name}
                    </span>
                  </span>
                  <span className="text-[13px] tabular-nums text-muted-foreground">
                    {fmt(t.plays)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Recent sign-ups */}
        <div className="rounded-xl bg-raised p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent sign-ups</h3>
            <button
              type="button"
              onClick={() => onNavigate("users")}
              className="text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Show all
            </button>
          </div>
          <ul className="mt-3 space-y-1">
            {recentUsers.slice(0, 5).map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => onEditUser(user)}
                  className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-panel-hover"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="bg-secondary text-xs font-semibold">
                      {(
                        user.displayName?.charAt(0) || user.email.charAt(0)
                      ).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {user.displayName || user.username || "Listener"}
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  {user.role === "ADMIN" && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Admin
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Health + attention */}
        <div className="space-y-3">
          <div className="rounded-xl bg-raised p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">System health</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => health.refetch()}
                aria-label="Re-run health checks"
                className="text-muted-foreground"
              >
                <RefreshCw
                  className={cn("h-4 w-4", health.isFetching && "animate-spin")}
                />
              </Button>
            </div>
            <div className="mt-1 divide-y divide-border">
              <HealthRow
                icon={Database}
                label="Database"
                check={health.data?.database}
                loading={health.isLoading}
              />
              <HealthRow
                icon={HardDrive}
                label="Audio storage"
                check={health.data?.storage}
                loading={health.isLoading}
              />
            </div>
            {health.isError && (
              <p className="mt-2 text-[13px] text-destructive">
                Health check request failed.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-raised p-5">
            <h3 className="text-sm font-semibold">Needs attention</h3>
            {s && attention.length === 0 && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" /> Catalogue
                looks healthy.
              </p>
            )}
            <ul className="mt-2 space-y-1">
              {attention.map((a) => (
                <li key={a.text}>
                  <button
                    type="button"
                    onClick={() => onNavigate(a.tab)}
                    className="group flex w-full items-center gap-3 rounded-md p-1.5 text-left text-sm transition-colors hover:bg-panel-hover"
                  >
                    <a.icon className="h-4 w-4 shrink-0 text-amber-400" />
                    <span className="flex-1">{a.text}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
