"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { TextareaWrapper } from "@/components/ui/textarea-wrapper";
import { SelectWrapper } from "@/components/ui/select-wrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { Save, Loader2, Film } from "lucide-react";
import type { Plan } from "@/types/database";

// Schema dinámico basado en configuración
const getCreateMovieSchema = (minDuration: number = 20/60, maxDuration: number = 180) => z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  genre: z.string().min(1, "Debes seleccionar un género"),
  duration_minutes: z.number()
    .min(minDuration, `La duración mínima es ${minDuration >= 1 ? `${minDuration} minuto${minDuration > 1 ? 's' : ''}` : `${Math.round(minDuration * 60)} segundos`}`)
    .max(maxDuration, `La duración máxima es ${maxDuration} minutos`),
  user_prompt: z.string().min(50, "El prompt debe tener al menos 50 caracteres"),
  user_plot: z.string().optional(),
  user_ending: z.string().optional(),
  ending_type: z.enum(["user", "ai"]),
  rental_price: z.number().min(0).optional(),
  available_plans: z.array(z.string()).optional(),
});

interface AdminCreateMovieClientProps {
  plans: Plan[];
  genres: Array<{ id: string; name: string; icon: string; color: string }>;
}

export function AdminCreateMovieClient({
  plans,
  genres,
}: AdminCreateMovieClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [allPlansSelected, setAllPlansSelected] = useState(true);

  // Cargar configuración de límites de duración
  const { data: adminConfig } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/config')
      return res.json()
    }
  })

  const durationLimits = adminConfig?.data?.movie_duration_limits || {
    min_duration_minutes: 20/60, // 20 segundos mínimo
    max_duration_minutes: 180
  }

  const minDuration = durationLimits.min_duration_minutes || 20/60 // 20 segundos por defecto
  const maxDuration = durationLimits.max_duration_minutes || 180

  type CreateMovieFormData = z.infer<ReturnType<typeof getCreateMovieSchema>>

  const form = useForm<CreateMovieFormData>({
    resolver: zodResolver(getCreateMovieSchema(minDuration, maxDuration)),
    defaultValues: {
      title: "",
      description: "",
      genre: "",
      duration_minutes: Math.max(minDuration, Math.min(10, maxDuration)),
      user_prompt: "",
      user_plot: "",
      user_ending: "",
      ending_type: "ai",
      rental_price: 2.99,
      available_plans: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateMovieFormData) => {
      const response = await fetch(API_ENDPOINTS.movies.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          available_plans: allPlansSelected ? null : (selectedPlans.length > 0 ? selectedPlans : null),
          is_admin_created: true, // Flag para identificar que fue creada por admin
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error desconocido" }));
        console.error("Error response:", error);
        throw new Error(error.error || error.details || "Error al crear película");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Película creada",
        description: "La película ha sido creada correctamente",
        variant: "success",
      });
      router.push(`/admin/movies/${data.data.id}`);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error al crear película",
        description: error.message || "Error desconocido. Revisa la consola del servidor para más detalles.",
        variant: "error",
      });
    },
  });

  const onSubmit = (data: CreateMovieFormData) => {
    createMutation.mutate({
      ...data,
      available_plans: allPlansSelected ? undefined : selectedPlans,
    });
  };

  const togglePlan = (planId: string) => {
    if (selectedPlans.includes(planId)) {
      setSelectedPlans(selectedPlans.filter((id) => id !== planId));
    } else {
      setSelectedPlans([...selectedPlans, planId]);
    }
    setAllPlansSelected(false);
  };

  const toggleAllPlans = () => {
    if (allPlansSelected) {
      setAllPlansSelected(false);
      setSelectedPlans([]);
    } else {
      setAllPlansSelected(true);
      setSelectedPlans(plans.map((p) => p.id));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crear Película (Super Admin)"
        subtitle="Crea una película y define para qué planes está disponible"
      />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputWrapper
                  label="Título"
                  placeholder="Ej: La Aventura del Héroe"
                  {...form.register("title")}
                  error={form.formState.errors.title?.message}
                />

                <TextareaWrapper
                  label="Descripción"
                  placeholder="Breve descripción de la película..."
                  {...form.register("description")}
                  rows={3}
                />

                <SelectWrapper
                  label="Género"
                  value={form.watch("genre")}
                  onChange={(v) => form.setValue("genre", v)}
                  options={genres.map((g) => ({
                    value: g.id,
                    label: `${g.icon} ${g.name}`,
                  }))}
                  error={form.formState.errors.genre?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputWrapper
                    label={`Duración (minutos) (${minDuration}-${maxDuration})`}
                    type="number"
                    min={minDuration}
                    max={maxDuration}
                    {...form.register("duration_minutes", {
                      valueAsNumber: true,
                    })}
                    error={form.formState.errors.duration_minutes?.message}
                  />

                  <InputWrapper
                    label="Precio de Alquiler (€)"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("rental_price", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Prompt y contenido */}
            <Card>
              <CardHeader>
                <CardTitle>Contenido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TextareaWrapper
                  label="Prompt Principal *"
                  placeholder="Describe la idea principal de la película (mínimo 50 caracteres)..."
                  {...form.register("user_prompt")}
                  rows={4}
                  error={form.formState.errors.user_prompt?.message}
                />

                <TextareaWrapper
                  label="Trama Detallada (opcional)"
                  placeholder="Describe la trama completa si lo deseas..."
                  {...form.register("user_plot")}
                  rows={4}
                />

                <SelectWrapper
                  label="Tipo de Final"
                  value={form.watch("ending_type")}
                  onChange={(v) => form.setValue("ending_type", v as "user" | "ai")}
                  options={[
                    { value: "ai", label: "🤖 Final sorpresa (IA decide)" },
                    { value: "user", label: "✍️ Final definido por usuario" },
                  ]}
                />

                {form.watch("ending_type") === "user" && (
                  <TextareaWrapper
                    label="Final Definido"
                    placeholder="Describe cómo quieres que termine la película..."
                    {...form.register("user_ending")}
                    rows={3}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel de planes */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Planes Disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 pb-4 border-b border-border">
                  <Checkbox
                    id="all-plans"
                    checked={allPlansSelected}
                    onCheckedChange={toggleAllPlans}
                  />
                  <label
                    htmlFor="all-plans"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Disponible para todos los planes
                  </label>
                </div>

                {!allPlansSelected && (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground-muted">
                      Selecciona los planes que pueden acceder a esta película:
                    </p>
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-background-secondary"
                      >
                        <Checkbox
                          id={`plan-${plan.id}`}
                          checked={selectedPlans.includes(plan.id)}
                          onCheckedChange={() => togglePlan(plan.id)}
                        />
                        <label
                          htmlFor={`plan-${plan.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {plan.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {allPlansSelected && (
                  <p className="text-sm text-foreground-muted">
                    Esta película estará disponible para todos los planes
                    activos.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Botón de guardar */}
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Crear Película
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

