"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GenerationProgress } from "@/types/api";
import { API_ENDPOINTS } from "@/lib/utils/constants";

// ============================================
// Queries
// ============================================

export function useGenerationProgress(movieId: string) {
  return useQuery<GenerationProgress>({
    queryKey: ["generation", "progress", movieId],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.generate.progress(movieId));
      if (!response.ok) throw new Error("Failed to fetch generation progress");
      return response.json();
    },
    enabled: !!movieId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll cada 2 segundos si está generando, cada 10 si está completado
      if (
        data?.status === "script_generating" ||
        data?.status === "video_generating" ||
        data?.status === "audio_generating" ||
        data?.status === "assembling"
      ) {
        return 2000; // 2 segundos
      }
      if (data?.status === "completed" || data?.status === "failed") {
        return false; // No hacer polling si está completado o falló
      }
      return 5000; // 5 segundos por defecto
    },
    refetchIntervalInBackground: true,
  });
}

// ============================================
// Mutations
// ============================================

export function useGenerateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      movie_id: string;
      user_prompt: string;
      user_plot?: string;
      user_ending?: string;
      genre: string;
      duration_minutes: number;
      character_ids?: string[];
    }) => {
      const response = await fetch(API_ENDPOINTS.generate.script, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate script");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["movie", variables.movie_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["generation", "progress", variables.movie_id],
      });
    },
  });
}

export function useApproveScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movieId: string) => {
      const response = await fetch(API_ENDPOINTS.generate.script, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ movie_id: movieId, approved: true }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve script");
      }
      return response.json();
    },
    onSuccess: (_, movieId) => {
      queryClient.invalidateQueries({ queryKey: ["movie", movieId] });
      queryClient.invalidateQueries({
        queryKey: ["generation", "progress", movieId],
      });
    },
  });
}

export function useStartGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      movie_id: string;
      type: "video" | "audio" | "assembly";
    }) => {
      const endpoint =
        data.type === "video"
          ? API_ENDPOINTS.generate.video
          : data.type === "audio"
          ? API_ENDPOINTS.generate.audio
          : API_ENDPOINTS.generate.assemble;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ movie_id: data.movie_id }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start generation");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["movie", variables.movie_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["generation", "progress", variables.movie_id],
      });
    },
  });
}
