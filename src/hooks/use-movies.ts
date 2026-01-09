"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { Movie } from "@/types/database";
import type { PaginatedResponse } from "@/types/api";
import { API_ENDPOINTS } from "@/lib/utils/constants";

interface MovieFilters {
  genre?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

// ============================================
// Queries
// ============================================

export function useMovies(filters: MovieFilters = {}) {
  const { user, profile } = useAuth();
  const { page = 1, pageSize = 20, ...queryParams } = filters;

  return useQuery<PaginatedResponse<Movie>>({
    queryKey: ["movies", filters, profile?.plan_id],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(queryParams).filter(([_, v]) => v !== undefined)
        ),
      });

      // Añadir plan_id si el usuario está autenticado
      if (user && profile?.plan_id) {
        params.set("plan_id", profile.plan_id);
      }

      const response = await fetch(`${API_ENDPOINTS.movies.list}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch movies");
      return response.json();
    },
  });
}

export function useMovie(id: string) {
  return useQuery<Movie>({
    queryKey: ["movie", id],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.movies.get(id));
      if (!response.ok) throw new Error("Failed to fetch movie");
      return response.json();
    },
    enabled: !!id,
  });
}

export function useMyMovies() {
  const { user } = useAuth();

  return useQuery<Movie[]>({
    queryKey: ["movies", "my", user?.id],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.movies.list, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch my movies");
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!user,
  });
}

// ============================================
// Mutations
// ============================================

export function useCreateMovie() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      genre: string;
      duration_minutes: number;
      user_prompt: string;
      user_plot?: string;
      user_ending?: string;
      ending_type: "user" | "ai";
      character_ids?: string[];
      use_random_characters?: boolean;
      random_characters_count?: number;
    }) => {
      const response = await fetch(API_ENDPOINTS.movies.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create movie");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });
}

export function useUpdateMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Movie> & { id: string }) => {
      const response = await fetch(API_ENDPOINTS.movies.update(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update movie");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["movie", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });
}

export function useDeleteMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(API_ENDPOINTS.movies.delete(id), {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete movie");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });
}

export function usePublishMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      publish,
    }: {
      id: string;
      publish: boolean;
    }) => {
      const endpoint = publish
        ? API_ENDPOINTS.movies.publish(id)
        : API_ENDPOINTS.movies.unpublish(id);
      const response = await fetch(endpoint, {
        method: publish ? "POST" : "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish movie");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["movie", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });
}
