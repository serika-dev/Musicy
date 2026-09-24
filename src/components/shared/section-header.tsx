import Link from "next/link"
import type * as React from "react"

import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  href?: string
  actionLabel?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  href,
  actionLabel = "Show all",
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {href ? (
            <Link href={href} className="hover:underline underline-offset-4">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action
        ? action
        : href && (
            <Link
              href={href}
              className="shrink-0 pb-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4"
            >
              {actionLabel}
            </Link>
          )}
    </div>
  )
}
