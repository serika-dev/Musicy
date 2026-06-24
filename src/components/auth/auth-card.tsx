"use client";

import { Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviders, signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

export function AuthCard({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGoogle, setHasGoogle] = useState(false);
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<
    boolean | null
  >(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, router, callbackUrl]);

  useEffect(() => {
    getProviders().then((providers) => {
      if (providers?.google) setHasGoogle(true);
    });
  }, []);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) =>
        setIsRegistrationAllowed(
          data ? data.settings?.allow_registration !== "false" : true,
        ),
      )
      .catch(() => setIsRegistrationAllowed(true));
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setError("");
    setMode(next);
    // Keep the URL in sync without a full navigation so the switch animates.
    window.history.replaceState(
      null,
      "",
      next === "login" ? "/login" : "/register",
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) setError("Invalid email or password");
      else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, displayName }),
      });
      if (response.ok) {
        switchMode("login");
        setError("");
      } else {
        const data = await response.json();
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const registrationClosed =
    mode === "register" && isRegistrationAllowed === false;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background" />
      <div className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[28rem] w-[28rem] animate-float rounded-full bg-primary/25 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-[130px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-[120px]" />

      <div className="w-full max-w-md space-y-6">
        {/* Distinct glass logo for auth */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link
            href="/"
            aria-label="Musicy home"
            className="animate-float transition-transform hover:scale-105 active:scale-95"
          >
            <Logo
              size="lg"
              variant="glass"
              showWordmark={false}
              idSuffix="auth"
            />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight">
              {mode === "login" ? "Welcome back" : "Join Musicy"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to continue listening"
                : "Create an account to start streaming"}
            </p>
          </div>
        </div>

        {/* Animated segmented toggle */}
        <div className="segmented mx-auto flex w-full max-w-xs rounded-full border border-white/10 bg-white/5 text-sm font-semibold backdrop-blur-xl">
          <span
            className="segmented-thumb"
            style={{
              width: "calc(50% - 0.25rem)",
              transform:
                mode === "login" ? "translateX(0)" : "translateX(100%)",
            }}
          />
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={cn(
              "relative z-10 flex-1 rounded-full py-2 transition-colors",
              mode === "login" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={cn(
              "relative z-10 flex-1 rounded-full py-2 transition-colors",
              mode === "register" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Sign up
          </button>
        </div>

        {/* Liquid glass card */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8">
          {error && (
            <div className="mb-4 animate-scale-in rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {registrationClosed ? (
            <div className="space-y-6 py-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Registration Closed</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  New user registration is currently disabled by the site
                  administrator. Please check back later.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => switchMode("login")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <div key={mode} className="animate-scale-in space-y-4">
              {mode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field
                    id="login-email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={setEmail}
                  />
                  <Field
                    id="login-password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                  />
                  <SubmitButton loading={loading} label="Sign in" />
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <Field
                    id="reg-email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={setEmail}
                  />
                  <Field
                    id="reg-username"
                    label="Username"
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={setUsername}
                  />
                  <Field
                    id="reg-display"
                    label="Display name"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={setDisplayName}
                  />
                  <Field
                    id="reg-password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    minLength={6}
                  />
                  <SubmitButton
                    loading={loading}
                    disabled={isRegistrationAllowed === null}
                    label="Create account"
                  />
                </form>
              )}

              {hasGoogle && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-transparent px-2 text-muted-foreground">
                        or
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="glass"
                    className="w-full press"
                    onClick={() => signIn("google", { callbackUrl })}
                  >
                    Continue with Google
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        className="border-white/10 bg-white/5 transition-all focus:border-primary/40 focus:bg-white/10"
      />
    </div>
  );
}

function SubmitButton({
  loading,
  label,
  disabled,
}: {
  loading: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      variant="gradient"
      className="w-full press"
      disabled={loading || disabled}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {label === "Sign in" ? "Signing in..." : "Creating account..."}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
