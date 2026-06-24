"use client";

import { Music2, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<
    boolean | null
  >(null);
  const router = useRouter();
  const { status } = useSession();

  // Check if registration is allowed
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch("/api/settings/public");
        if (response.ok) {
          const data = await response.json();
          setIsRegistrationAllowed(
            data.settings?.allow_registration !== "false",
          );
        } else {
          setIsRegistrationAllowed(true);
        }
      } catch {
        setIsRegistrationAllowed(true);
      }
    };
    checkRegistrationStatus();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          username,
          displayName,
        }),
      });

      if (response.ok) {
        router.push("/login?message=Registration successful");
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

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background" />
      <div className="pointer-events-none absolute -top-32 -right-32 -z-10 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 -z-10 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <Card className="w-full max-w-md border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2.5 mb-4 hover:opacity-80 transition-opacity"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
              <Music2 className="h-6 w-6 text-white" />
            </span>
            <span className="text-2xl font-black tracking-tight">Musicy</span>
          </Link>
          <CardTitle className="text-2xl font-black">
            Create your account
          </CardTitle>
          <CardDescription>
            Join Musicy to start streaming in lossless quality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRegistrationAllowed === false ? (
            <div className="space-y-6 text-center py-4">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-foreground">
                  Registration Closed
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  New user registration is currently disabled by the site
                  administrator. Please check back later or contact the host if
                  you believe this is an error.
                </p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || isRegistrationAllowed === null}
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
