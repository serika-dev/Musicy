"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <AuthCard initialMode="register" />
    </Suspense>
  );
}
