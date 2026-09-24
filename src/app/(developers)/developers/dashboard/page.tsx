"use client";

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
}

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function mask(key: string) {
  return `${key.slice(0, 8)}${"•".repeat(12)}${key.slice(-4)}`;
}

export default function ApiKeysPage() {
  const { status } = useSession();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      setKeys(res.ok ? await res.json() : []);
    } catch {
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      const created: ApiKey = await res.json();
      setName("");
      setRevealed(created.id);
      toast.success("Key created. Copy it now and store it somewhere safe.");
      load();
    } catch {
      toast.error("Couldn't create the key");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (k: ApiKey) => {
    if (
      !confirm(
        `Revoke "${k.name}"? Anything using it will stop working immediately.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/api-keys/${k.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Key revoked");
      load();
    } catch {
      toast.error("Couldn't revoke the key");
    }
  };

  const copy = async (k: ApiKey) => {
    try {
      await navigator.clipboard.writeText(k.key);
      setCopied(k.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Copy failed; reveal the key and copy it by hand");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <p className="text-sm font-medium text-primary">Dashboard</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        API keys
      </h1>
      <p className="mt-3 text-muted-foreground">
        Keys act as your account. Use one per integration so you can revoke them
        separately.{" "}
        <Link
          href="/developers/docs/authentication"
          className="text-primary hover:underline"
        >
          How authentication works
        </Link>
      </p>

      {status === "loading" && (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {status === "unauthenticated" && (
        <div className="mt-10 rounded-xl bg-raised p-8 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Sign in to manage keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            API keys belong to your Musicy account.
          </p>
          <Link
            href="/login?callbackUrl=/developers/dashboard"
            className="mt-6 inline-flex h-10 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background"
          >
            Sign in
          </Link>
        </div>
      )}

      {status === "authenticated" && (
        <>
          <form
            onSubmit={create}
            className="mt-10 flex flex-col gap-3 rounded-xl bg-raised p-5 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="key-name" className="text-sm font-medium">
                New key
              </label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Discord now-playing bot"
                maxLength={60}
                className="mt-1.5 h-10"
              />
            </div>
            <Button
              type="submit"
              disabled={!name.trim() || creating}
              className="h-10 rounded-full px-5 font-semibold"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create key
            </Button>
          </form>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Your keys
            </h2>
            {keys === null ? (
              <div className="mt-3 space-y-2">
                {["a", "b"].map((k) => (
                  <div
                    key={k}
                    className="h-20 animate-pulse rounded-xl bg-raised"
                  />
                ))}
              </div>
            ) : keys.length === 0 ? (
              <p className="mt-3 rounded-xl p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
                No keys yet. Create one above to make your first request.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-xl ring-1 ring-border">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{k.name}</p>
                      <code className="mt-1 block truncate font-mono text-[13px] text-muted-foreground">
                        {revealed === k.id ? k.key : mask(k.key)}
                      </code>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created {dateFmt.format(new Date(k.createdAt))} ·{" "}
                        {k.lastUsed
                          ? `last used ${dateFmt.format(new Date(k.lastUsed))}`
                          : "never used"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={revealed === k.id ? "Hide key" : "Show key"}
                        onClick={() =>
                          setRevealed(revealed === k.id ? null : k.id)
                        }
                        className="rounded-full text-muted-foreground"
                      >
                        {revealed === k.id ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Copy key"
                        onClick={() => copy(k)}
                        className="rounded-full text-muted-foreground"
                      >
                        {copied === k.id ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Revoke ${k.name}`}
                        onClick={() => revoke(k)}
                        className="rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
