"use client"

import { type ComponentProps, type ReactNode, useEffect, useState } from "react"
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

  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  useEffect(() => {
    if (!emblaApi) return
    const update = () => {
      setCanPrev(emblaApi.canScrollPrev())
      setCanNext(emblaApi.canScrollNext())
    }
    update()
    emblaApi.on("select", update).on("reInit", update).on("scroll", update)
    return () => {
      emblaApi.off("select", update).off("reInit", update).off("scroll", update)
    }
  }, [emblaApi])

  const scrollPrev = () => emblaApi?.scrollPrev()
  const scrollNext = () => emblaApi?.scrollNext()

  const arrow =
    "absolute top-[40%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-popover/95 text-foreground shadow-xl shadow-black/50 transition-all hover:scale-105 hover:bg-accent active:scale-95 md:flex"

  return (
    <div className={cn("group/carousel relative", className)}>
      {/* Viewport padding matches MediaCard's hover-panel bleed so the panel
          isn't clipped on the first and last slides. */}
      <div ref={emblaRef} className="-m-2 overflow-hidden p-2 md:-m-3 md:p-3">
        <div className={cn("flex gap-4 md:gap-6", slidesClassName)}>
          {children}
        </div>
      </div>
      {showArrows && canPrev && (
        <button
          type="button"
          onClick={scrollPrev}
          className={cn(arrow, "-left-2 opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100")}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {showArrows && canNext && (
        <button
          type="button"
          onClick={scrollNext}
          className={cn(arrow, "-right-2 opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100")}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

/**
 * A carousel slide sized so whole cards line up with the gap:
 *  - ~2.3 slides on mobile  (< 640px, peeks the next card)
 *  - 3 slides on sm, 4 on md, 5 on lg, 6 on xl, 7 on 2xl
 */
export function CarouselSlide({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-w-0 flex-none basis-[calc(42%-0.5rem)] sm:basis-[calc((100%-2rem)/3)] md:basis-[calc((100%-4.5rem)/4)] lg:basis-[calc((100%-6rem)/5)] xl:basis-[calc((100%-7.5rem)/6)] 2xl:basis-[calc((100%-9rem)/7)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
