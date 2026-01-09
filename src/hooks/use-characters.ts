"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { Character } from "@/types/database";
import { API_ENDPOINTS } from "@/lib/utils/constants";

interface CharacterFilters {
  category?: string;
  search?: string;
  is_premium?: boolean;
  is_active?: boolean;
}

// ============================================
// Queries
// ============================================

export function useCharacters(filters: CharacterFilters = {}) {
  return useQuery<Character[]>({
    queryKey: ["characters", filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v !== undefined) as any
      );

      const url = params.toString()
        ? `${API_ENDPOINTS.characters.list}?${params}`
        : API_ENDPOINTS.characters.list;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch characters");
      const data = await response.json();
      return data.data || [];
    },
  });
}

export function useCharacter(id: string) {
  return useQuery<Character>({
    queryKey: ["character", id],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.characters.get(id));
      if (!response.ok) throw new Error("Failed to fetch character");
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCharactersByCategory(category: string) {
  return useCharacters({ category });
}

export function useUserCharacters() {
  const { user } = useAuth();

  return useQuery<Character[]>({
    queryKey: ["characters", "user", user?.id],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.characters.userCharacters);
      if (!response.ok) throw new Error("Failed to fetch user characters");
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!user,
  });
}

// ============================================
// Mutations (Admin only)
// ============================================

export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      slug: string;
      category: string;
      tags?: string[];
      reference_images: string[];
      thumbnail_url?: string;
      voice_provider_id?: string;
      voice_id?: string;
      voice_name?: string;
      visual_prompt_base?: string;
      is_premium?: boolean;
    }) => {
      const response = await fetch(API_ENDPOINTS.characters.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create character");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useUpdateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Character> & { id: string }) => {
      const response = await fetch(API_ENDPOINTS.characters.update(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update character");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["character", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(API_ENDPOINTS.characters.delete(id), {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete character");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}
