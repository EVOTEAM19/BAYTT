"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Settings,
  Video,
  Mic,
  Music,
  Brain,
  HardDrive,
  Image,
  Sparkles,
  Zap,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { ApiProvider } from "@/types/database";

const PROVIDER_TYPES = {
  video: { icon: Video, label: "Video", description: "Generación de clips de video" },
  audio: { icon: Mic, label: "Voz/Audio", description: "Síntesis de voz para diálogos" },
  music: { icon: Music, label: "Música", description: "Bandas sonoras y música de fondo" },
  llm: { icon: Brain, label: "Guiones (LLM)", description: "Generación de guiones" },
  storage: { icon: HardDrive, label: "Almacenamiento", description: "Almacenamiento de archivos" },
  image: { icon: Image, label: "Imagen", description: "Generación de imágenes" },
  lora_training: { icon: Sparkles, label: "LoRA", description: "Entrenamiento de modelos" },
  lip_sync: { icon: Mic, label: "Lip Sync", description: "Sincronización de labios" },
} as const;

export default function ProvidersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [globalMockMode, setGlobalMockMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Cargar proveedores
  const { data: providersData, refetch: refetchProviders } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.providers.list);
      if (!response.ok) throw new Error("Failed to fetch providers");
      return response.json();
    },
  });

  // Cargar configuración
  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.admin.config);
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();
      const config = data.data || {};
      
      // Determinar mock mode global (true si TODOS los tipos están en mock)
      const configTypes = Object.keys(PROVIDER_TYPES);
      const allMock = configTypes.every(type => {
        const configKey = `${type}_config`;
        const typeConfig = config[configKey];
        return typeConfig?.mock_mode === true;
      });
      
      setGlobalMockMode(allMock);
    } catch (error) {
      console.error("Error fetching configuration:", error);
    }
  };

  const toggleGlobalMockMode = async () => {
    const newValue = !globalMockMode;
    
    setIsLoading(true);
    setGlobalMockMode(newValue);
    
    try {
      // Actualizar mock_mode para todos los tipos
      const configTypes = Object.keys(PROVIDER_TYPES);
      
      await Promise.all(
        configTypes.map(async (type) => {
          const configKey = `${type}_config`;
          
          // Obtener configuración actual
          const configResponse = await fetch(API_ENDPOINTS.admin.config);
          const configData = await configResponse.json();
          let currentTypeConfig = configData.data?.[configKey] || { mock_mode: false, primary_id: null };
          
          // Si se desactiva el mock y no hay primary_id, buscar proveedor activo
          if (!newValue && !currentTypeConfig.primary_id) {
            const providers = providersData?.data || [];
            const activeProvider = providers.find(
              (p: ApiProvider) => p.type === type && p.is_active && !p.slug?.startsWith('mock_')
            );
            if (activeProvider) {
              currentTypeConfig.primary_id = activeProvider.id;
            }
          }
          
          const updatedConfig = {
            ...currentTypeConfig,
            mock_mode: newValue,
          };
          
          await fetch(API_ENDPOINTS.admin.config, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: configKey,
              value: updatedConfig,
            }),
          });
        })
      );

      toast({
        title: newValue ? "🔧 Modo Mock activado" : "🚀 Modo Producción activado",
        description: newValue 
          ? "Todos los proveedores usarán datos simulados" 
          : "Todos los proveedores usarán APIs reales",
        variant: "success",
      });
      
      await fetchConfiguration();
    } catch (error: any) {
      console.error("Error updating mock mode:", error);
      setGlobalMockMode(!newValue); // Revertir
      toast({
        title: "Error",
        description: error.message || "Error al actualizar modo mock",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupProviders = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch("/api/admin/setup-final-providers", {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al configurar proveedores");
      }
      
      const result = await response.json();
      
      toast({
        title: "✅ Proveedores configurados",
        description: `${result.results?.filter((r: any) => r.success).length || 0} proveedores configurados correctamente`,
        variant: "success",
      });
      
      await refetchProviders();
      await fetchConfiguration();
    } catch (error: any) {
      console.error("Error setting up providers:", error);
      toast({
        title: "Error",
        description: error.message || "Error al configurar proveedores",
        variant: "error",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // Agrupar proveedores activos por tipo
  const activeProvidersByType: Record<string, ApiProvider[]> = {};
  
  if (providersData?.data) {
    const providers: ApiProvider[] = providersData.data || [];
    const activeProviders = providers.filter(p => p.is_active && !p.slug?.startsWith('mock_'));
    
    activeProviders.forEach((provider) => {
      if (!activeProvidersByType[provider.type]) {
        activeProvidersByType[provider.type] = [];
      }
      activeProvidersByType[provider.type].push(provider);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="⚙️ Proveedores"
          subtitle="Gestiona los proveedores de IA para generación de contenido"
        />
        <Button
          onClick={setupProviders}
          disabled={isSettingUp}
          variant="outline"
        >
          {isSettingUp ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Configurando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Configurar Proveedores
            </>
          )}
        </Button>
      </div>

      {/* Toggle Global de Mock Mode */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {globalMockMode ? (
                <AlertCircle className="h-6 w-6 text-warning" />
              ) : (
                <Zap className="h-6 w-6 text-success" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">Modo Mock Global</span>
                  {globalMockMode && (
                    <Badge variant="warning" className="text-xs">
                      ACTIVO
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground-muted">
                  {globalMockMode
                    ? "Todos los proveedores usan datos simulados sin costes"
                    : "Todos los proveedores usan APIs reales con costes"}
                </p>
              </div>
            </div>
            <Switch
              checked={!globalMockMode}
              onCheckedChange={toggleGlobalMockMode}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Proveedores Activos por Tipo */}
      <div className="space-y-4">
        {Object.entries(PROVIDER_TYPES).map(([type, config]) => {
          const providers = activeProvidersByType[type] || [];
          const activeProvider = providers.find(p => p.is_default) || providers[0];
          const Icon = config.icon;

          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                    <p className="text-sm text-foreground-muted">{config.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeProvider ? (
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-success" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{activeProvider.name}</span>
                            <Badge variant="success" className="text-xs">
                              ACTIVO
                            </Badge>
                          </div>
                          {activeProvider.api_url && (
                            <p className="text-xs text-foreground-muted mt-1">
                              {activeProvider.api_url}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          router.push(`/admin/providers/${activeProvider.id}`);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-background-secondary border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      <div>
                        <p className="text-sm font-medium">
                          {globalMockMode
                            ? "Usando modo Mock (sin configuración requerida)"
                            : "No hay proveedor activo"}
                        </p>
                        {!globalMockMode && (
                          <p className="text-xs text-foreground-muted mt-1">
                            Usa el botón "Configurar Proveedores" para configurar este tipo
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
