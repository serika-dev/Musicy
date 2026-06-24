"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useProfile } from "@/hooks/useProfile"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    // Redirect to admin panel if user is admin
    if (profile?.role === 'ADMIN') {
      router.push("/admin")
    }
    // Redirect regular users to home
    else if (profile?.role === 'USER') {
      router.push("/")
    }
  }, [profile, router])

  if (status === "loading" || profileLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  // This component just handles redirects now
  return null
}
