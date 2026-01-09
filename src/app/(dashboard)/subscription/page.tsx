"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils/formatters";
import { Check, CreditCard, TrendingUp, X } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [cancelDialog, setCancelDialog] = useState(false);

  const plan = profile?.plans;

  // Obtener todos los planes
  const { data: allPlans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.plans.list);
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      return data.data || [];
    },
  });

  const handleUpgrade = (planId: string) => {
    router.push(`/checkout?plan_id=${planId}`);
  };

  const handleCancel = () => {
    // TODO: Implementar cancelación de suscripción
    toast.success("Suscripción cancelada");
    setCancelDialog(false);
  };

  const moviesUsed = profile?.movies_created_this_month || 0;
  const moviesLimit = plan?.movies_per_month || 0;
  const moviesProgress = moviesLimit > 0 ? (moviesUsed / moviesLimit) * 100 : 0;

  const rentalsUsed = profile?.rentals_this_month || 0;
  const rentalsLimit = plan?.rentals_per_month || 0;
  const rentalsProgress =
    rentalsLimit > 0 ? (rentalsUsed / rentalsLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mi Suscripción</h1>
        <p className="text-foreground-muted mt-1">
          Gestiona tu plan y revisa tu uso
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plan Actual</CardTitle>
            <Badge variant="default">{plan?.name || "Sin plan"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {plan ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground-muted">
                    Películas creadas este mes
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {moviesUsed} / {moviesLimit}
                  </span>
                </div>
                <Progress value={moviesProgress} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground-muted">
                    Alquileres este mes
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {rentalsUsed} / {rentalsLimit}
                  </span>
                </div>
                <Progress value={rentalsProgress} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-foreground-muted">Precio</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatPrice(plan.price)}
                    <span className="text-sm font-normal text-foreground-muted">
                      /mes
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Calidad</p>
                  <p className="text-lg font-semibold text-foreground">
                    {plan.video_quality.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="default"
                  onClick={() => {
                    const nextPlan = allPlans.find(
                      (p: any) => p.price > plan.price
                    );
                    if (nextPlan) {
                      handleUpgrade(nextPlan.id);
                    }
                  }}
                >
                  Mejorar Plan
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setCancelDialog(true)}
                >
                  Cancelar Suscripción
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-foreground-muted mb-4">
                No tienes un plan activo
              </p>
              <Button onClick={() => router.push("/browse")}>
                Ver Planes Disponibles
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      {allPlans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Comparar Planes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allPlans.map((p: any) => {
              const isCurrent = plan?.id === p.id;
              const isUpgrade = plan && p.price > plan.price;

              return (
                <Card
                  key={p.id}
                  className={isCurrent ? "ring-2 ring-primary" : ""}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      {isCurrent && (
                        <Badge variant="default">Actual</Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-foreground">
                        {formatPrice(p.price)}
                      </span>
                      <span className="text-foreground-muted">/mes</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {p.movies_per_month > 0 ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-foreground-muted" />
                        )}
                        <span className="text-foreground">
                          {p.movies_per_month} películas/mes
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-foreground">
                          {p.video_quality.toUpperCase()} calidad
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.custom_characters ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-foreground-muted" />
                        )}
                        <span className="text-foreground">
                          Personajes personalizados
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.can_publish_marketplace ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-foreground-muted" />
                        )}
                        <span className="text-foreground">
                          Publicar en marketplace
                        </span>
                      </div>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant={isUpgrade ? "default" : "secondary"}
                        className="w-full"
                        onClick={() => handleUpgrade(p.id)}
                      >
                        {isUpgrade ? "Mejorar" : "Cambiar"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Suscripción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar tu suscripción? Perderás
              acceso a todas las funciones premium al final del período de
              facturación actual.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setCancelDialog(false)}
              className="flex-1"
            >
              Mantener Suscripción
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancelar Suscripción
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
