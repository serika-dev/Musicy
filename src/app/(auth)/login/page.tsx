"use client";

import { Music2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviders, signIn, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGoogle, setHasGoogle] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { status } = useSession();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    getProviders().then((providers) => {
      if (providers?.google) setHasGoogle(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background" />
      <div className="pointer-events-none absolute -top-32 -left-32 -z-10 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 -z-10 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
              <Music2 className="h-6 w-6 text-white" />
            </span>
            <span className="text-2xl font-black tracking-tight">Musicy</span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to continue listening
            </p>
          </div>
        </div>

        <Card className="border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="login-email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {hasGoogle && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("google", { callbackUrl })}
                >
                  Continue with Google
                </Button>
              </>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
