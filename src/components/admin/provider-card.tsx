"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPrice, formatDate, timeAgo } from "@/lib/utils/formatters";
import { formatNumber } from "@/lib/utils/formatters";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  MoreHorizontal,
  Power,
  PowerOff,
  Trash2,
  TestTube,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { toast } from "@/hooks/use-toast";
import type { ApiProvider } from "@/types/database";
import { PROVIDER_TYPES } from "@/types/provider";

interface ProviderCardProps {
  provider: ApiProvider;
  onEdit?: (id: string) => void;
  onTest?: (id: string) => void;
}

export function ProviderCard({
  provider,
  onEdit,
  onTest,
}: ProviderCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);

  const providerType = PROVIDER_TYPES[provider.type];

  // Stats del día (simulado - debería venir de la DB)
  const todayStats = {
    requests: Math.floor(Math.random() * 100),
    errors: Math.floor(Math.random() * 5),
    cost: (Math.random() * 10).toFixed(2),
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await fetch(`${API_ENDPOINTS.admin.providers}/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!response.ok) throw new Error("Failed to update provider");
      return response.json();
    },
    onSuccess: () => {
      toast.success(
        provider.is_active
          ? "Proveedor desactivado"
          : "Proveedor activado"
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
    onError: () => {
      toast.error("Error al actualizar el proveedor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_ENDPOINTS.admin.providers}/${provider.id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete provider");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Proveedor eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
    onError: () => {
      toast.error("Error al eliminar el proveedor");
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_ENDPOINTS.providers.test(provider.id)}`,
        {
          method: "POST",
        }
      );
      if (!response.ok) throw new Error("Test failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.success ? "Conexión exitosa" : "Error en la conexión");
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
    onError: () => {
      toast.error("Error al probar la conexión");
    },
  });

  const handleTest = async () => {
    setTesting(true);
    if (onTest) {
      onTest(provider.id);
    } else {
      await testMutation.mutateAsync();
    }
    setTesting(false);
  };

  const getStatusIcon = () => {
    if (!provider.is_active) {
      return <span className="text-foreground-muted">⚪</span>;
    }
    // TODO: Verificar si hay errores recientes
    if (todayStats.errors > 0) {
      return <span className="text-error">🔴</span>;
    }
    return <span className="text-success">🟢</span>;
  };

  return (
    <Card className="hover:shadow-card-hover transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{providerType.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  {provider.name}
                </h3>
                {getStatusIcon()}
                {provider.is_default && (
                  <Badge variant="default" className="text-xs">
                    DEFAULT
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground-muted">
                {provider.slug} • {providerType.label}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(provider.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleTest} disabled={testing}>
                <TestTube className="h-4 w-4 mr-2" />
                {testing ? "Probando..." : "Probar Conexión"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toggleActiveMutation.mutate(!provider.is_active)
                }
              >
                {provider.is_active ? (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Activar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm("¿Eliminar este proveedor?")) {
                    deleteMutation.mutate();
                  }
                }}
                className="text-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-foreground-muted">Requests Hoy</p>
            <p className="font-semibold text-foreground">
              {formatNumber(todayStats.requests)}
            </p>
          </div>
          <div>
            <p className="text-foreground-muted">Errores</p>
            <p className="font-semibold text-error">
              {todayStats.errors}
            </p>
          </div>
          <div>
            <p className="text-foreground-muted">Coste Hoy</p>
            <p className="font-semibold text-foreground">
              {formatPrice(parseFloat(todayStats.cost))}
            </p>
          </div>
        </div>

        {/* Cost Info */}
        <div className="flex items-center justify-between text-xs text-foreground-muted pt-2 border-t border-border">
          <span>
            {provider.cost_per_second
              ? `${formatPrice(provider.cost_per_second)}/seg`
              : provider.cost_per_request
              ? `${formatPrice(provider.cost_per_request)}/req`
              : "Sin coste"}
          </span>
          <span>Prioridad: {provider.priority}</span>
        </div>

        {/* Last Test */}
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Clock className="h-3 w-3" />
          <span>
            Último test: {timeAgo(provider.updated_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
