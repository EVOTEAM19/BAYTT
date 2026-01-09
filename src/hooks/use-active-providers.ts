"use client";

import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/utils/constants";

interface ActiveProviders {
  mockMode: boolean;
  image: { id: string; name: string } | null;
  lora: { id: string; name: string } | null;
  llm: { id: string; name: string } | null;
  audio: { id: string; name: string } | null;
}

export function useActiveProviders() {
  return useQuery<ActiveProviders>({
    queryKey: ["active-providers"],
    queryFn: async () => {
      // Obtener configuración de admin (mock mode)
      const configResponse = await fetch(API_ENDPOINTS.admin.config);
      const configData = await configResponse.json();
      const mockMode = configData.data?.mock_mode === true;

      // Si está en modo mock, devolver datos mock
      if (mockMode) {
        return {
          mockMode: true,
          image: { id: "mock", name: "Mock Image Provider" },
          lora: { id: "mock", name: "Mock LoRA Provider" },
          llm: { id: "mock", name: "Mock LLM Provider" },
          audio: { id: "mock", name: "Mock Audio Provider" },
        };
      }

      // Obtener proveedores activos
      const [imageRes, loraRes, llmRes, audioRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.providers.list}?type=image`),
        fetch(`${API_ENDPOINTS.providers.list}?type=lora_training`),
        fetch(`${API_ENDPOINTS.providers.list}?type=llm`),
        fetch(`${API_ENDPOINTS.providers.list}?type=audio`),
      ]);

      const imageData = await imageRes.json();
      const loraData = await loraRes.json();
      const llmData = await llmRes.json();
      const audioData = await audioRes.json();

      const imageProvider = imageData.data?.find(
        (p: any) => p.is_active && p.is_default
      );
      const loraProvider = loraData.data?.find(
        (p: any) => p.is_active && p.is_default
      );
      const llmProvider = llmData.data?.find(
        (p: any) => p.is_active && p.is_default
      );
      const audioProvider = audioData.data?.find(
        (p: any) => p.is_active && p.is_default
      );

      return {
        mockMode: false,
        image: imageProvider
          ? { id: imageProvider.id, name: imageProvider.name }
          : null,
        lora: loraProvider
          ? { id: loraProvider.id, name: loraProvider.name }
          : null,
        llm: llmProvider
          ? { id: llmProvider.id, name: llmProvider.name }
          : null,
        audio: audioProvider
          ? { id: audioProvider.id, name: audioProvider.name }
          : null,
      };
    },
  });
}

