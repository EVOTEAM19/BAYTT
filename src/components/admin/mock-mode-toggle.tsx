"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, AlertTriangle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";

export function MockModeToggle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);

  // Obtener estado actual
  const { data } = useQuery({
    queryKey: ["admin", "mock-mode"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.admin.config);
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();
      return data;
    },
  });

  useEffect(() => {
    if (data?.mock_mode !== undefined) {
      setIsEnabled(data.mock_mode?.enabled || false);
    }
  }, [data]);

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch(API_ENDPOINTS.admin.config, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "mock_mode",
          value: { enabled },
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update mock mode");
      }
      return response.json();
    },
    onSuccess: (_, enabled) => {
      setIsEnabled(enabled);
      queryClient.invalidateQueries({ queryKey: ["admin", "mock-mode"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "config"] });
      toast.success(
        enabled
          ? "Modo Desarrollo activado - Todas las APIs usarán datos mock"
          : "Modo Desarrollo desactivado - Se usarán APIs reales"
      );
    },
    onError: () => {
      toast.error("Error al actualizar el modo desarrollo");
    },
  });

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate(checked);
  };

  return (
    <Card className="border-2 border-primary/50 bg-background-secondary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="mock-mode" className="text-base font-semibold">
                  Modo Desarrollo (Mock)
                </Label>
                {isEnabled && (
                  <Badge variant="default" className="text-xs">
                    ACTIVO
                  </Badge>
                )}
              </div>
              {isEnabled && (
                <p className="text-sm text-warning flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  Mock mode activo - las películas usarán datos de prueba sin coste
                </p>
              )}
            </div>
          </div>
          <Switch
            id="mock-mode"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            className="scale-125"
          />
        </div>
      </CardContent>
    </Card>
  );
}
