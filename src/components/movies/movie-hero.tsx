"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Movie } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Play, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MovieHeroProps {
  movies: Movie[];
  autoRotate?: boolean;
  rotateInterval?: number;
  onPlay?: (movie: Movie) => void;
}

export function MovieHero({
  movies,
  autoRotate = true,
  rotateInterval = 10000,
  onPlay,
}: MovieHeroProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentMovie = movies[currentIndex];

  useEffect(() => {
    if (!autoRotate || movies.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, rotateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRotate, movies.length, rotateInterval]);

  useEffect(() => {
    // Reset video when movie changes
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [currentIndex]);

  const handlePlay = () => {
    if (onPlay) {
      onPlay(currentMovie);
    } else {
      router.push(`/watch/${currentMovie.id}`);
    }
  };

  const handleInfo = () => {
    router.push(`/browse/movie/${currentMovie.id}`);
  };

  if (!currentMovie) {
    return null;
  }

  const trailerUrl = (currentMovie as any).trailer_url || currentMovie.video_url_1080p;

  return (
    <div className="relative w-full h-[80vh] overflow-hidden">
      {/* Video Background */}
      {trailerUrl && (
        <video
          ref={videoRef}
          src={trailerUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Fallback Image */}
      {!trailerUrl && currentMovie.thumbnail_url && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${currentMovie.thumbnail_url})` }}
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-4 md:px-8 lg:px-16">
        <div className="max-w-2xl space-y-4">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground drop-shadow-2xl">
            {currentMovie.title}
          </h1>

          {/* Description */}
          {currentMovie.description && (
            <p className="text-foreground text-sm md:text-base line-clamp-3 drop-shadow-lg">
              {currentMovie.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              size="lg"
              variant="default"
              onClick={handlePlay}
              className="px-8"
            >
              <Play className="h-5 w-5 mr-2 fill-current" />
              Reproducir
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleInfo}
              className="px-8"
            >
              <Info className="h-5 w-5 mr-2" />
              Más información
            </Button>
          </div>
        </div>
      </div>

      {/* Indicators - If multiple movies */}
      {movies.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-foreground-muted hover:bg-foreground"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
