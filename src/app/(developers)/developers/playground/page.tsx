"use client";

import { AlertTriangle, Loader2, Play, Search } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "@/components/developers/code-block";
import { AuthBadge, MethodBadge } from "@/components/developers/docs-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ALL_ENDPOINTS,
  API_GROUPS,
  type Endpoint,
  exampleBody,
  snippets,
} from "@/lib/developer-docs";
import { cn } from "@/lib/utils";

type Result = {
  status: number;
  ms: number;
  body: string;
  location?: string | null;
};

function initialValues(ep: Endpoint): Record<string, string> {
  const v: Record<string, string> = {};
  for (const p of [...(ep.pathParams ?? []), ...(ep.query ?? [])])
    v[p.name] = p.required ? (p.example ?? "") : "";
  return v;
}

export default function Playground() {
  const { status: sessionStatus } = useSession();
  const [selectedId, setSelectedId] = useState(
    ALL_ENDPOINTS.find((e) => e.id === "search")?.id ?? ALL_ENDPOINTS[0].id,
  );
  const ep = ALL_ENDPOINTS.find((e) => e.id === selectedId) ?? ALL_ENDPOINTS[0];
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(ep),
  );
  const [body, setBody] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const select = (id: string) => {
    const next = ALL_ENDPOINTS.find((e) => e.id === id);
    if (!next) return;
    setSelectedId(id);
    setValues(initialValues(next));
    const b = exampleBody(next);
    setBody(b ? JSON.stringify(b, null, 2) : "");
    setResult(null);
  };

  const url = useMemo(() => {
    let path = ep.path;
    for (const p of ep.pathParams ?? [])
      path = path.replace(
        `{${p.name}}`,
        encodeURIComponent(values[p.name] || `{${p.name}}`),
      );
    const qs = (ep.query ?? [])
      .filter((p) => values[p.name])
      .map((p) => `${p.name}=${encodeURIComponent(values[p.name])}`)
      .join("&");
    return `${path}${qs ? `?${qs}` : ""}`;
  }, [ep, values]);

  const missing = [...(ep.pathParams ?? []), ...(ep.query ?? [])].filter(
    (p) => p.required && !values[p.name],
  );

  const send = async () => {
    setLoading(true);
    setResult(null);
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
      if (ep.body?.length) headers["Content-Type"] = "application/json";
      const res = await fetch(url, {
        method: ep.method,
        headers,
        body: ep.body?.length && body.trim() ? body : undefined,
        redirect: ep.path.endsWith("/stream") ? "manual" : "follow",
        // With a key pasted, test exactly what an external client would see.
        credentials: apiKey.trim() ? "omit" : "same-origin",
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON (e.g. audio or a redirect)
      }
      setResult({
        status: res.type === "opaqueredirect" ? 302 : res.status,
        ms: Math.round(performance.now() - start),
        body:
          res.type === "opaqueredirect"
            ? "Redirected to the audio file (open the URL to follow it)."
            : pretty.slice(0, 20000) || "(empty body)",
      });
    } catch (err) {
      setResult({
        status: 0,
        ms: Math.round(performance.now() - start),
        body: `Request failed: ${String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const s = snippets(origin, ep);
  const q = filter.trim().toLowerCase();

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Tools</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          API playground
        </h1>
        <p className="mt-2 text-muted-foreground">
          Send real requests from your browser.{" "}
          {sessionStatus === "authenticated"
            ? "You're signed in, so requests use your session unless you paste a key."
            : "Paste an API key to call endpoints that need one."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Endpoint picker */}
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto no-scrollbar">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter endpoints"
              aria-label="Filter endpoints"
              className="h-9 pl-9"
            />
          </div>
          <div className="space-y-4">
            {API_GROUPS.map((g) => {
              const items = g.endpoints.filter(
                (e) =>
                  !q ||
                  e.title.toLowerCase().includes(q) ||
                  e.path.toLowerCase().includes(q),
              );
              if (items.length === 0) return null;
              return (
                <div key={g.slug}>
                  <p className="mb-1 px-2 text-xs font-semibold text-muted-foreground">
                    {g.title}
                  </p>
                  <ul>
                    {items.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => select(e.id)}
                          aria-current={e.id === ep.id}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                            e.id === ep.id
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-panel-hover hover:text-foreground",
                          )}
                        >
                          <MethodBadge
                            method={e.method}
                            className="min-w-[3rem] text-[10px]"
                          />
                          <span className="truncate">{e.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Request / response */}
        <div className="min-w-0 space-y-5">
          <div className="rounded-xl bg-raised p-5">
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method={ep.method} />
              <code className="min-w-0 break-all font-mono text-sm">{url}</code>
              <AuthBadge auth={ep.auth} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {ep.description}{" "}
              <Link
                href={`/developers/docs/api/${ep.group}#${ep.id}`}
                className="text-primary hover:underline"
              >
                Docs
              </Link>
            </p>

            {[...(ep.pathParams ?? []), ...(ep.query ?? [])].length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[...(ep.pathParams ?? []), ...(ep.query ?? [])].map((p) => (
                  <div key={p.name} className="block">
                    <label
                      htmlFor={`param-${p.name}`}
                      className="flex items-baseline gap-2 text-[13px]"
                    >
                      <code className="font-mono font-semibold">{p.name}</code>
                      {p.required && (
                        <span className="text-[11px] text-amber-300">
                          required
                        </span>
                      )}
                    </label>
                    <Input
                      id={`param-${p.name}`}
                      value={values[p.name] ?? ""}
                      placeholder={p.example ?? p.type}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [p.name]: e.target.value }))
                      }
                      className="mt-1 h-9 font-mono text-[13px]"
                    />
                  </div>
                ))}
              </div>
            )}

            {ep.body?.length ? (
              <label className="mt-5 block">
                <span className="text-[13px] font-semibold">JSON body</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck={false}
                  rows={Math.min(10, Math.max(4, body.split("\n").length + 1))}
                  className="mt-1 w-full rounded-md border border-input bg-background/60 p-3 font-mono text-[13px] focus:border-primary focus:outline-none"
                />
              </label>
            ) : null}

            <div className="mt-5">
              <label
                htmlFor="playground-key"
                className="text-[13px] font-semibold"
              >
                API key
              </label>
              <Input
                id="playground-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  sessionStatus === "authenticated"
                    ? "Optional: using your session"
                    : "Paste a key"
                }
                autoComplete="off"
                className="mt-1 h-9 font-mono text-[13px]"
              />
            </div>

            {ep.method !== "GET" && (
              <p className="mt-4 flex items-start gap-2 text-[13px] text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This request changes real data in the account it runs as.
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <Button
                onClick={send}
                disabled={loading || missing.length > 0}
                className="h-10 rounded-full px-6 font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                Send request
              </Button>
              {missing.length > 0 && (
                <span className="text-[13px] text-muted-foreground">
                  Fill in {missing.map((m) => m.name).join(", ")}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-3 text-sm">
                <span className="font-semibold">Response</span>
                {result && (
                  <>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-xs font-semibold",
                        result.status >= 200 && result.status < 400
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300",
                      )}
                    >
                      {result.status || "ERR"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {result.ms} ms
                    </span>
                  </>
                )}
              </div>
              {result ? (
                <CodeBlock
                  title="Body"
                  tabs={[{ label: "Body", code: result.body }]}
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl text-sm text-muted-foreground ring-1 ring-border">
                  Send a request to see the response.
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-sm font-semibold">Code</p>
              <CodeBlock
                tabs={[
                  { label: "cURL", code: s.curl },
                  { label: "JavaScript", code: s.js },
                  { label: "Python", code: s.py },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
