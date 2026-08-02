"use client"

import { type ComponentProps, type ReactNode } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CarouselProps {
  children: ReactNode
  className?: string
  slidesClassName?: string
  slideClassName?: string
  showArrows?: boolean
  autoplay?: boolean
  align?: "start" | "center" | "end"
  slideSizes?: number
}

export function Carousel({
  children,
  className,
  slidesClassName,
  showArrows = true,
  autoplay = false,
  align = "start",
}: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align,
      loop: false,
      dragFree: true,
      containScroll: "trimSnaps",
    },
    autoplay ? [Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })] : [],
  )

  const scrollPrev = () => emblaApi?.scrollPrev()
  const scrollNext = () => emblaApi?.scrollNext()

  return (
    <div className={cn("relative", className)}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className={cn("flex gap-3", slidesClassName)}>
          {children}
        </div>
      </div>
      {showArrows && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-lg border border-border/50 backdrop-blur-sm transition-opacity hover:bg-background hover:scale-110 active:scale-95 disabled:opacity-0 hidden md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-lg border border-border/50 backdrop-blur-sm transition-opacity hover:bg-background hover:scale-110 active:scale-95 disabled:opacity-0 hidden md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  )
}

/**
 * A carousel slide sized as a fraction of the viewport so cards stay large.
 * `gap-3` (0.75rem) is subtracted so slides line up exactly.
 *
 *  - ~2.2 slides on mobile  (< 640px)
 *  - ~3   slides on sm      (≥ 640px)
 *  - ~4   slides on md      (≥ 768px)
 *  - ~5   slides on lg      (≥ 1024px)
 *  - ~6   slides on xl      (≥ 1280px)
 */
export function CarouselSlide({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex-none min-w-0 basis-[calc(45%-0.75rem)] sm:basis-[calc(33.333%-0.75rem)] md:basis-[calc(25%-0.75rem)] lg:basis-[calc(20%-0.75rem)] xl:basis-[calc(16.666%-0.75rem)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
