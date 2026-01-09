"use client";

import { useRef, useState, useEffect } from "react";
import type { Movie } from "@/types/database";
import { MovieCard } from "./movie-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  isLoading?: boolean;
  variant?: "poster" | "backdrop";
  onMovieClick?: (movie: Movie) => void;
}

export function MovieCarousel({
  title,
  movies,
  isLoading = false,
  variant = "poster",
  onMovieClick,
}: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkScroll);
      return () => scrollElement.removeEventListener("scroll", checkScroll);
    }
  }, [movies]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "flex-shrink-0",
                variant === "poster" ? "w-32 h-48" : "w-64 h-36"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-4 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="text-2xl font-bold text-foreground px-2">{title}</h2>

      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory",
            "scroll-smooth",
            "px-2"
          )}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className={cn(
                "flex-shrink-0 snap-start",
                variant === "poster"
                  ? "w-32 sm:w-40 md:w-48"
                  : "w-64 sm:w-80 md:w-96"
              )}
            >
              <MovieCard
                movie={movie}
                variant={variant}
                onPlay={onMovieClick}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
