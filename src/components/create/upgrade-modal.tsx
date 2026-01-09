"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: {
    name: string;
    movies_per_month: number;
  };
  moviesCreated: number;
}

export function UpgradeModal({
  open,
  onOpenChange,
  currentPlan,
  moviesCreated,
}: UpgradeModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Límite de Películas Alcanzado
          </DialogTitle>
          <DialogDescription>
            Has alcanzado el límite de tu plan actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-foreground-muted mb-2">
                    Plan Actual
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {currentPlan.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-foreground-muted">
                      Películas creadas este mes
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {moviesCreated} / {currentPlan.movies_per_month}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {moviesCreated >= currentPlan.movies_per_month ? (
                      <X className="h-8 w-8 text-error" />
                    ) : (
                      <Check className="h-8 w-8 text-success" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4">
              ¿Qué puedes hacer?
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    Actualizar tu plan
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Obtén más películas por mes con un plan superior
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    Esperar al próximo mes
                  </p>
                  <p className="text-sm text-foreground-muted">
                    El contador se reinicia cada mes
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                router.push("/dashboard/subscription");
                onOpenChange(false);
              }}
            >
              Ver Planes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

