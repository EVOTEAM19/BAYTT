"use client";

import { useCreationStore } from "@/stores/creation-store";
import { GENRES } from "@/types/movie";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StepGenre() {
  const { genre, setGenre } = useCreationStore();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          ¿Qué género quieres?
        </h2>
        <p className="text-foreground-muted">
          Selecciona el género de tu película
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {GENRES.map((genreItem) => {
          const isSelected = genre === genreItem.id;

          return (
            <Card
              key={genreItem.id}
              hover
              className={cn(
                "relative transition-all cursor-pointer",
                isSelected && "ring-2 ring-primary shadow-glow"
              )}
              style={{
                borderColor: isSelected ? genreItem.color : undefined,
              }}
              onClick={() => setGenre(genreItem.id)}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">{genreItem.icon}</div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-semibold text-foreground">
                    {genreItem.name}
                  </h3>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
