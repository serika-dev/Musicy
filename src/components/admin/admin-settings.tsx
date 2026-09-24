"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Field =
  | {
      key: string;
      type: "switch";
      label: string;
      description: string;
      default: "true" | "false";
      danger?: boolean;
    }
  | {
      key: string;
      type: "select";
      label: string;
      description: string;
      default: string;
      options: { value: string; label: string }[];
    }
  | {
      key: string;
      type: "input" | "textarea";
      label: string;
      description: string;
      default: string;
      placeholder?: string;
    };

export const AUDIO_QUALITY_OPTIONS = [
  { value: "auto", label: "Automatic" },
  { value: "low", label: "Data saver" },
  { value: "medium", label: "Normal" },
  { value: "high", label: "High" },
  { value: "lossless", label: "Lossless (FLAC)" },
];

// Values the old admin select wrote, mapped onto the player's quality levels.
const LEGACY_QUALITY: Record<string, string> = {
  FLAC_LOSSLESS: "lossless",
  MP3_320K: "high",
  AAC_256K: "high",
  AUTO: "auto",
};

const GROUPS: { title: string; description: string; fields: Field[] }[] = [
  {
    title: "Access",
    description: "Who can get in, and what they can do without an account.",
    fields: [
      {
        key: "ALLOW_REGISTRATION",
        type: "switch",
        label: "New sign-ups",
        description: "Let anyone create an account from the sign-up page.",
        default: "true",
      },
      {
        key: "ALLOW_ANONYMOUS_PLAYBACK",
        type: "switch",
        label: "Guest playback",
        description: "Visitors who aren't signed in can stream music.",
        default: "true",
      },
      {
        key: "REQUIRE_EMAIL_VERIFICATION",
        type: "switch",
        label: "Require verified email",
        description: "Accounts must confirm their email before streaming.",
        default: "false",
      },
      {
        key: "PUBLIC_API_ACCESS",
        type: "switch",
        label: "Developer API",
        description: "Allow API keys and the developer portal.",
        default: "true",
      },
      {
        key: "MAINTENANCE_MODE",
        type: "switch",
        label: "Maintenance mode",
        description: "Everyone except admins sees a maintenance screen.",
        default: "false",
        danger: true,
      },
    ],
  },
  {
    title: "Listening",
    description:
      "Defaults for new listeners. Each listener can change these later.",
    fields: [
      {
        key: "DEFAULT_AUDIO_QUALITY",
        type: "select",
        label: "Default streaming quality",
        description:
          "Used until a listener picks their own quality in onboarding or Settings.",
        default: "auto",
        options: AUDIO_QUALITY_OPTIONS,
      },
      {
        key: "ONBOARDING_ENABLED",
        type: "switch",
        label: "New-listener onboarding",
        description:
          "Ask new listeners for genres, artists and quality before their first visit to Home.",
        default: "true",
      },
    ],
  },
  {
    title: "Branding & announcements",
    description: "How the platform presents itself.",
    fields: [
      {
        key: "SITE_NAME",
        type: "input",
        label: "Platform name",
        description:
          "Shown in page titles, the maintenance screen and share embeds.",
        default: "Serika Music",
      },
      {
        key: "ANNOUNCEMENT",
        type: "textarea",
        label: "Announcement banner",
        description:
          "Shown at the top of every page for signed-in listeners. Leave empty to hide it.",
        default: "",
        placeholder: "e.g. Scheduled maintenance Saturday 02:00–03:00 UTC.",
      },
    ],
  },
];

export const KNOWN_SYSTEM_KEYS = GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key),
);

interface AdminSettingsProps {
  settings: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
  onRefresh: () => void;
  refreshing: boolean;
}

export function AdminSettings({
  settings,
  onSave,
  onRefresh,
  refreshing,
}: AdminSettingsProps) {
  const [saving, setSaving] = useState<string | null>(null);
  // Text fields are edited locally and saved explicitly.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const stored = (key: string, fallback: string) => {
    const v = settings[key];
    if (v === undefined || v === null) return fallback;
    return key === "DEFAULT_AUDIO_QUALITY" ? (LEGACY_QUALITY[v] ?? v) : v;
  };
  const value = (f: Field) => drafts[f.key] ?? stored(f.key, f.default);
  const setDraft = (key: string, v: string) =>
    setDrafts((d) => ({ ...d, [key]: v }));

  const save = async (key: string, v: string) => {
    setSaving(key);
    try {
      await onSave(key, v);
      setDrafts(({ [key]: _, ...rest }) => rest);
    } finally {
      setSaving(null);
    }
  };

  const customKeys = Object.keys(settings).filter(
    (k) => !KNOWN_SYSTEM_KEYS.includes(k.toUpperCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="gap-1.5 text-muted-foreground"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
          Reload from server
        </Button>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="rounded-xl bg-raised">
          <header className="px-5 pb-2 pt-5">
            <h2 className="font-semibold">{group.title}</h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </header>
          <div className="divide-y divide-border">
            {group.fields.map((f) => {
              const v = value(f);
              const dirty =
                drafts[f.key] !== undefined &&
                drafts[f.key] !== stored(f.key, f.default);
              return (
                <div
                  key={f.key}
                  className={cn(
                    "flex gap-4 px-5 py-4",
                    f.type === "textarea"
                      ? "flex-col"
                      : "flex-col sm:flex-row sm:items-center sm:justify-between",
                  )}
                >
                  <div className="min-w-0">
                    <label
                      htmlFor={`sys-${f.key}`}
                      className="text-sm font-medium"
                    >
                      {f.label}
                    </label>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {f.description}
                    </p>
                  </div>

                  {f.type === "switch" && (
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {saving === f.key && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {f.danger && v === "true" && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                          Active
                        </span>
                      )}
                      <Switch
                        id={`sys-${f.key}`}
                        checked={v === "true"}
                        disabled={saving === f.key}
                        onCheckedChange={(on) =>
                          save(f.key, on ? "true" : "false")
                        }
                      />
                    </div>
                  )}

                  {f.type === "select" && (
                    <select
                      id={`sys-${f.key}`}
                      value={v}
                      disabled={saving === f.key}
                      onChange={(e) => save(f.key, e.target.value)}
                      className="h-9 rounded-md border border-border bg-secondary px-3 text-sm focus:border-primary focus:outline-none sm:w-52"
                    >
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {(f.type === "input" || f.type === "textarea") && (
                    <div
                      className={cn(
                        "flex gap-2",
                        f.type === "textarea"
                          ? "flex-col items-end"
                          : "items-center sm:w-auto",
                      )}
                    >
                      {f.type === "input" ? (
                        <Input
                          id={`sys-${f.key}`}
                          value={v}
                          onChange={(e) => setDraft(f.key, e.target.value)}
                          className="h-9 sm:w-64"
                        />
                      ) : (
                        <Textarea
                          id={`sys-${f.key}`}
                          value={v}
                          placeholder={f.placeholder}
                          maxLength={280}
                          onChange={(e) => setDraft(f.key, e.target.value)}
                          className="min-h-20 w-full"
                        />
                      )}
                      <Button
                        size="sm"
                        disabled={!dirty || saving === f.key}
                        onClick={() => save(f.key, v.trim())}
                        className="h-9 rounded-full px-4"
                      >
                        {saving === f.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : dirty ? (
                          "Save"
                        ) : (
                          "Saved"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {customKeys.length > 0 && (
        <section className="rounded-xl bg-raised">
          <header className="px-5 pb-2 pt-5">
            <h2 className="font-semibold">Advanced</h2>
            <p className="text-[13px] text-muted-foreground">
              Other keys stored in the database.
            </p>
          </header>
          <div className="divide-y divide-border">
            {customKeys.map((k) => (
              <div
                key={k}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <code className="text-[13px]">{k}</code>
                <div className="flex items-center gap-2">
                  <Input
                    value={drafts[k] ?? settings[k] ?? ""}
                    onChange={(e) => setDraft(k, e.target.value)}
                    className="h-9 sm:w-64"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={saving === k}
                    onClick={() => save(k, drafts[k] ?? settings[k] ?? "")}
                    className="h-9 rounded-full px-4"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
