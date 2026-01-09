"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiProvider } from "@/types/database";
import type { ProviderType } from "@/types/provider";
import { API_ENDPOINTS } from "@/lib/utils/constants";

// ============================================
// Queries
// ============================================

export function useProviders(type?: ProviderType) {
  return useQuery<ApiProvider[]>({
    queryKey: ["providers", type],
    queryFn: async () => {
      const url = type
        ? `${API_ENDPOINTS.providers.list}?type=${type}`
        : API_ENDPOINTS.providers.list;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch providers");
      const data = await response.json();
      return data.data || [];
    },
  });
}

export function useProvider(id: string) {
  return useQuery<ApiProvider>({
    queryKey: ["provider", id],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.providers.get(id));
      if (!response.ok) throw new Error("Failed to fetch provider");
      return response.json();
    },
    enabled: !!id,
  });
}

export function useProvidersByType(type: ProviderType) {
  return useProviders(type);
}

// ============================================
// Mutations
// ============================================

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: ProviderType;
      name: string;
      slug: string;
      api_url?: string;
      api_key_encrypted?: string;
      auth_method: string;
      config?: Record<string, unknown>;
      is_active?: boolean;
      is_default?: boolean;
      priority?: number;
      cost_per_second?: number;
      cost_per_request?: number;
    }) => {
      const response = await fetch(API_ENDPOINTS.providers.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create provider");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<ApiProvider> & { id: string }) => {
      const response = await fetch(API_ENDPOINTS.providers.update(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update provider");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["provider", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(API_ENDPOINTS.providers.delete(id), {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete provider");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}

export function useTestProvider() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(API_ENDPOINTS.providers.test(id), {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to test provider");
      }
      return response.json();
    },
  });
}
