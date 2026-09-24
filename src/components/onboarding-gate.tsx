"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useFollowedArtists } from "@/hooks/useFollowedArtists";
import { useSettings } from "@/hooks/useSettings";

// Pages a listener may need before (or instead of) onboarding.
const EXEMPT = [
  "/welcome",
  "/admin",
  "/settings",
  "/login",
  "/register",
  "/privacy",
  "/terms",
];

/**
 * Sends a listener who hasn't finished onboarding to /welcome. Existing
 * accounts that already follow artists are treated as onboarded, so the flow
 * only reaches genuinely fresh libraries.
 */
export function OnboardingGate({ enabled = true }: { enabled?: boolean }) {
  const { status } = useSession();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { settings, hydrated, isLoading } = useSettings();
  const { data: follows } = useFollowedArtists(1, 0);

  useEffect(() => {
    if (!enabled || status !== "authenticated" || !hydrated || isLoading)
      return;
    if (settings.onboardingCompleted) return;
    if (!follows || follows.total > 0) return;
    if (EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
      return;
    router.replace("/welcome");
  }, [
    enabled,
    status,
    hydrated,
    isLoading,
    settings.onboardingCompleted,
    follows,
    pathname,
    router,
  ]);

  return null;
}
