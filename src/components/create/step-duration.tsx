"use client";

import { useCreationStore } from "@/stores/creation-store";
import { DURATIONS } from "@/types/movie";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StepDuration() {
  const { duration_minutes, setDuration } = useCreationStore();
  const { profile } = useAuth();
  
  // Cargar configuración de límites de duración
  const { data: adminConfig } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/config')
      return res.json()
    }
  })

  const durationLimits = adminConfig?.data?.movie_duration_limits || {
    min_duration_minutes: 20/60, // 20 segundos mínimo
    max_duration_minutes: 180
  }

  const globalMinDuration = durationLimits.min_duration_minutes || 20/60 // 20 segundos por defecto
  const globalMaxDuration = durationLimits.max_duration_minutes || 180
  
  const plan = (profile as any)?.plans;
  const planData = Array.isArray(plan) ? plan[0] : plan;
  const planMaxDuration = planData?.max_duration_minutes || globalMaxDuration;
  
  // El máximo es el menor entre el límite del plan y el límite global
  const maxDuration = Math.min(planMaxDuration, globalMaxDuration);
  const minDuration = globalMinDuration;
  
  const availableDurations = DURATIONS.filter(
    (d) => d.minutes >= minDuration && d.minutes <= maxDuration
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          ¿Cuánto durará tu película?
        </h2>
        <p className="text-foreground-muted">
          Selecciona la duración ({minDuration}-{maxDuration} minutos). Límite de tu plan: {planMaxDuration} minutos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableDurations.map((duration) => {
          const isSelected = duration_minutes === duration.minutes;
          const isDisabled = duration.minutes > maxDuration;

          return (
            <Card
              key={duration.minutes}
              hover
              className={cn(
                "relative transition-all",
                isSelected && "ring-2 ring-primary shadow-glow",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !isDisabled && setDuration(duration.minutes)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold text-foreground">
                      {duration.label}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-foreground-muted">
                  {duration.scenes} escenas
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {duration_minutes && (
        <div className="text-center text-sm text-foreground-muted">
          Tu película tendrá aproximadamente{" "}
          {DURATIONS.find((d) => d.minutes === duration_minutes)?.scenes}{" "}
          escenas
        </div>
      )}
    </div>
  );
}
