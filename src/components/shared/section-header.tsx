import Link from "next/link"
import type * as React from "react"

import { Button } from "@/components/ui/button"
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
  actionLabel = "See all",
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action
        ? action
        : href && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 font-semibold text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={href}>{actionLabel}</Link>
            </Button>
          )}
    </div>
  )
}
