"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [marketplaceMargin, setMarketplaceMargin] = useState(0);
  const [defaultRentalPrice, setDefaultRentalPrice] = useState(0);
  const [creatorCommission, setCreatorCommission] = useState(70); // % que recibe el creador
  const [platformCommission, setPlatformCommission] = useState(30); // % que recibe BAYTT
  const [minDurationMinutes, setMinDurationMinutes] = useState(20/60); // 20 segundos por defecto
  const [maxDurationMinutes, setMaxDurationMinutes] = useState(180);

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin", "config"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.admin.config);
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();
      return data.data || {};
    },
  });

  // Cargar valores cuando se obtiene la config
  useEffect(() => {
    if (config?.marketplace_settings) {
      setMarketplaceMargin(config.marketplace_settings.margin_percentage || 30);
      setDefaultRentalPrice(config.marketplace_settings.default_rental_price || 2.99);
      setCreatorCommission(config.marketplace_settings.creator_commission || 70);
      setPlatformCommission(config.marketplace_settings.platform_commission || 30);
    }
    if (config?.movie_duration_limits) {
      setMinDurationMinutes(config.movie_duration_limits.min_duration_minutes || 20/60); // 20 segundos por defecto
      setMaxDurationMinutes(config.movie_duration_limits.max_duration_minutes || 180);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const promises = Object.entries(updates).map(([key, value]) =>
        fetch(API_ENDPOINTS.admin.config, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Configuración actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin", "config"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar configuración");
    },
  });

  const handleSave = () => {
    // Asegurar que la suma sea 100%
    const total = creatorCommission + platformCommission;
    if (total !== 100) {
      toast.error("La suma de comisiones debe ser 100%");
      return;
    }

    updateMutation.mutate({
      marketplace_settings: {
        margin_percentage: marketplaceMargin,
        default_rental_price: defaultRentalPrice,
        creator_commission: creatorCommission,
        platform_commission: platformCommission,
      },
    });
  };

  // Sincronizar comisiones
  useEffect(() => {
    setPlatformCommission(100 - creatorCommission);
  }, [creatorCommission]);

  if (isLoading) {
    return <div className="text-center py-12">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración General"
        subtitle="Gestiona los ajustes globales de la plataforma"
      />

      {/* Marketplace Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Marketplace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="margin_percentage">
              Margen de Ganancia por Película (%)
            </Label>
            <p className="text-sm text-foreground-muted mb-2">
              Porcentaje que se cobra a los creadores por cada alquiler de su película
            </p>
            <Input
              id="margin_percentage"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={marketplaceMargin}
              onChange={(e) => setMarketplaceMargin(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="default_rental_price">
              Precio de Alquiler por Defecto (€)
            </Label>
            <p className="text-sm text-foreground-muted mb-2">
              Precio sugerido para nuevas películas en el marketplace
            </p>
            <Input
              id="default_rental_price"
              type="number"
              min="0"
              step="0.01"
              value={defaultRentalPrice}
              onChange={(e) => setDefaultRentalPrice(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-4">Distribución de Ingresos por Alquileres</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator_commission">
                  % Creador
                </Label>
                <p className="text-sm text-foreground-muted mb-2">
                  Porcentaje que recibe el creador por cada alquiler
                </p>
                <Input
                  id="creator_commission"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={creatorCommission}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val >= 0 && val <= 100) {
                      setCreatorCommission(val);
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="platform_commission">
                  % BAYTT
                </Label>
                <p className="text-sm text-foreground-muted mb-2">
                  Porcentaje que recibe la plataforma por cada alquiler
                </p>
                <Input
                  id="platform_commission"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={platformCommission}
                  disabled
                  className="bg-background-secondary"
                />
                <p className="text-xs text-foreground-muted mt-1">
                  Calculado automáticamente (100% - % Creador)
                </p>
              </div>
            </div>

            {creatorCommission + platformCommission !== 100 && (
              <p className="text-sm text-error mt-2">
                ⚠️ La suma debe ser 100%
              </p>
            )}
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Configuración del Marketplace
          </Button>
        </CardContent>
      </Card>

      {/* Movie Duration Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Límites de Duración de Películas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground-muted mb-4">
            Configura los límites mínimo y máximo de duración para las películas que se pueden crear en la plataforma.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_duration_minutes">
                Duración Mínima (minutos)
              </Label>
              <p className="text-sm text-foreground-muted mb-2">
                Duración mínima permitida para crear una película
              </p>
              <Input
                id="min_duration_minutes"
                type="number"
                min="1"
                step="1"
                value={minDurationMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  if (val >= 1) {
                    setMinDurationMinutes(val);
                  }
                }}
              />
              <p className="text-xs text-foreground-muted mt-1">
                Mínimo: 1 minuto
              </p>
            </div>

            <div>
              <Label htmlFor="max_duration_minutes">
                Duración Máxima (minutos)
              </Label>
              <p className="text-sm text-foreground-muted mb-2">
                Duración máxima permitida para crear una película
              </p>
              <Input
                id="max_duration_minutes"
                type="number"
                min="1"
                step="1"
                value={maxDurationMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 180;
                  if (val >= 1) {
                    setMaxDurationMinutes(val);
                  }
                }}
              />
              <p className="text-xs text-foreground-muted mt-1">
                Recomendado: 180 minutos (3 horas)
              </p>
            </div>
          </div>

          {maxDurationMinutes < minDurationMinutes && (
            <div className="p-3 bg-error/10 rounded-lg border border-error/20">
              <p className="text-sm text-error">
                ⚠️ La duración máxima debe ser mayor o igual que la mínima
              </p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending || maxDurationMinutes < minDurationMinutes}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Límites de Duración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

