import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function MediaCardSkeleton({ rounded = false }: { rounded?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className={cn("aspect-square w-full", rounded ? "rounded-full" : "rounded-xl")} />
      <div className={cn("space-y-2", rounded && "flex flex-col items-center")}>
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function MediaGridSkeleton({
  count = 6,
  rounded = false,
  className,
}: {
  count?: number
  rounded?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} rounded={rounded} />
      ))}
    </div>
  )
}

export function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="h-12 w-12 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3 w-10" />
    </div>
  )
}

export function TrackListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <TrackRowSkeleton key={i} />
      ))}
    </div>
  )
}
