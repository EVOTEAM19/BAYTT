"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProviderForm } from "@/components/admin/provider-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";
import { encryptApiKey } from "@/lib/encryption/api-keys";
import type { ApiProvider } from "@/types/database";
// El ProviderForm usa un formato diferente, así que necesitamos adaptar los datos

interface AdminProviderFormClientProps {
  provider: ApiProvider | null;
  defaultType?: string;
}

export function AdminProviderFormClient({
  provider,
  defaultType,
}: AdminProviderFormClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!provider;

  // El ProviderForm maneja su propio guardado, así que solo necesitamos pasar callbacks

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/providers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
          subtitle={
            isEditing
              ? "Modifica la configuración del proveedor"
              : "Añade un nuevo proveedor de API"
          }
        />
      </div>

      <ProviderForm
        provider={provider ? {
          ...provider,
          provider_type: provider.type,
          api_endpoint: provider.api_url,
          api_version: provider.api_version || provider.config?.api_version
        } : undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
          router.push("/admin/providers");
        }}
        onCancel={() => router.push("/admin/providers")}
      />
    </div>
  );
}

