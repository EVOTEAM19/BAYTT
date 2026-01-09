"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Movie } from "@/types/database";
import { GENRES } from "@/types/movie";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDuration } from "@/lib/utils/formatters";
import { formatPrice } from "@/lib/utils/formatters";
import { Play, Plus, Info, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MovieCardProps {
  movie: Movie;
  variant?: "poster" | "backdrop";
  showInfo?: boolean;
  onPlay?: (movie: Movie) => void;
  onAddToList?: (movie: Movie) => void;
}

export function MovieCard({
  movie,
  variant = "poster",
  showInfo = true,
  onPlay,
  onAddToList,
}: MovieCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const genre = GENRES.find((g) => g.id === movie.genre);
  const thumbnail = movie.thumbnail_url || "/placeholder-movie.jpg";
  const aspectRatio = variant === "poster" ? "aspect-[2/3]" : "aspect-video";

  const handlePlay = () => {
    if (onPlay) {
      onPlay(movie);
    } else {
      router.push(`/watch/${movie.id}`);
    }
  };

  const handleInfo = () => {
    setShowDialog(true);
  };

  const handleCardClick = () => {
    router.push(`/browse/movie/${movie.id}`);
  };

  return (
    <>
      <div
        className={cn(
          "group relative cursor-pointer transition-all duration-300",
          aspectRatio,
          "overflow-hidden rounded-lg bg-card border border-border",
          isHovered && "scale-105 shadow-card-hover z-10"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        {/* Thumbnail */}
        <div className="relative w-full h-full">
          <Image
            src={thumbnail}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            sizes={variant === "poster" ? "(max-width: 768px) 50vw, 25vw" : "100vw"}
          />

          {/* Overlay - Visible on hover */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            {showInfo && (
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {genre && (
                    <Badge variant="secondary" className="text-xs">
                      {genre.icon} {genre.name}
                    </Badge>
                  )}
                  {movie.duration_minutes && (
                    <span className="text-xs text-foreground-muted">
                      {formatDuration(movie.duration_minutes)}
                    </span>
                  )}
                  {movie.average_rating && (
                    <div className="flex items-center gap-1 text-xs text-foreground-muted">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {movie.average_rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons - Visible on hover */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-300",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            >
              <Button
                size="icon"
                variant="default"
                className="h-12 w-12 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay();
                }}
              >
                <Play className="h-5 w-5 fill-current" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full border-2"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddToList) {
                    onAddToList(movie);
                  }
                }}
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full border-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInfo();
                }}
              >
                <Info className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Info overlay - Always visible if showInfo and not hovered */}
        {showInfo && !isHovered && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="font-semibold text-foreground text-xs line-clamp-1">
              {movie.title}
            </h3>
          </div>
        )}
      </div>

      {/* Info Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{movie.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {movie.description && (
              <p className="text-foreground-muted">{movie.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {genre && (
                <Badge variant="secondary">
                  {genre.icon} {genre.name}
                </Badge>
              )}
              {movie.duration_minutes && (
                <Badge variant="secondary">
                  {formatDuration(movie.duration_minutes)}
                </Badge>
              )}
              {movie.average_rating && (
                <Badge variant="secondary">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                  {movie.average_rating.toFixed(1)}
                </Badge>
              )}
              {movie.rental_price && (
                <Badge variant="default">
                  {formatPrice(movie.rental_price)}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="default" onClick={handlePlay}>
                <Play className="h-4 w-4 mr-2" />
                Reproducir
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/browse/movie/${movie.id}`)}>
                Ver Detalles
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
