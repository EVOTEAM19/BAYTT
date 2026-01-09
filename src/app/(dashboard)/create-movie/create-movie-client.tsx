"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile, Plan, Movie, Script } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { CreationWizard } from "@/components/create/creation-wizard";
import { GenerationProgress } from "@/components/create/generation-progress";
import { ScriptPreview } from "@/components/create/script-preview";
import { UpgradeModal } from "@/components/create/upgrade-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Film } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreationStore } from "@/stores/creation-store";

interface CreateMoviePageClientProps {
  user: User;
  profile: Profile;
  plan: Plan | null;
  canCreateMore: boolean;
  movieInProgress: Movie | null;
  script: Script | null;
  searchParams: { movie_id?: string; step?: string };
}

type FlowState = "WIZARD" | "SCRIPT_PREVIEW" | "GENERATION" | "COMPLETED";

export function CreateMoviePageClient({
  user,
  profile,
  plan,
  canCreateMore,
  movieInProgress,
  script,
  searchParams,
  isSuperAdmin = false,
}: CreateMoviePageClientProps) {
  const router = useRouter();
  const { setMovieId, reset } = useCreationStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(!canCreateMore);
  const [flowState, setFlowState] = useState<FlowState>("WIZARD");

  // Determinar estado del flujo basado en movieInProgress y script
  useEffect(() => {
    if (!movieInProgress) {
      setFlowState("WIZARD");
      return;
    }

    // Si hay movie_id en el store, actualizar
    if (movieInProgress.id) {
      setMovieId(movieInProgress.id);
    }

    // Determinar estado según el status de la película
    switch (movieInProgress.status) {
      case "script_generating":
        // Si hay script y no está aprobado, mostrar preview
        if (script && !script.is_approved) {
          setFlowState("SCRIPT_PREVIEW");
        } else {
          // Si no hay script aún, está generando
          setFlowState("GENERATION");
        }
        break;
      case "video_generating":
      case "audio_generating":
      case "assembling":
        setFlowState("GENERATION");
        break;
      case "completed":
        setFlowState("COMPLETED");
        break;
      case "failed":
        // Si falló, volver al wizard
        setFlowState("WIZARD");
        reset();
        break;
      default:
        setFlowState("WIZARD");
    }
  }, [movieInProgress, script, setMovieId, reset]);

  // Si hay step en query params, usarlo para determinar el estado
  useEffect(() => {
    if (searchParams.step) {
      switch (searchParams.step) {
        case "generating":
          setFlowState("GENERATION");
          break;
        case "preview":
          setFlowState("SCRIPT_PREVIEW");
          break;
        default:
          setFlowState("WIZARD");
      }
    }
  }, [searchParams.step]);

  const handleStartNew = () => {
    reset();
    setFlowState("WIZARD");
    router.push("/create-movie");
  };

  const renderContent = () => {
    switch (flowState) {
      case "WIZARD":
        if (!canCreateMore) {
          return (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-6xl mb-4">🎬</div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Límite de Películas Alcanzado
                  </h2>
                  <p className="text-foreground-muted">
                    Has alcanzado el límite de {plan?.movies_per_month || 0}{" "}
                    películas de tu plan actual este mes.
                  </p>
                  <div className="flex gap-4 justify-center mt-6">
                    <Button
                      variant="secondary"
                      onClick={() => router.push("/dashboard/my-movies")}
                    >
                      Ver Mis Películas
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => router.push("/dashboard/subscription")}
                    >
                      Actualizar Plan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        return <CreationWizard />;

      case "SCRIPT_PREVIEW":
        if (!movieInProgress) return null;
        return <ScriptPreview movieId={movieInProgress.id} />;

      case "GENERATION":
        if (!movieInProgress) return null;
        return <GenerationProgress movieId={movieInProgress.id} />;

      case "COMPLETED":
        if (!movieInProgress) return null;
        return (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-success/20 p-6">
                    <CheckCircle2 className="h-16 w-16 text-success" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    ¡Película Completada!
                  </h2>
                  <p className="text-foreground-muted">
                    Tu película "{movieInProgress.title}" ha sido generada
                    exitosamente.
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="default"
                    onClick={() =>
                      router.push(`/dashboard/my-movies/${movieInProgress.id}`)
                    }
                    leftIcon={<Film className="h-4 w-4" />}
                  >
                    Ver Película
                  </Button>
                  <Button variant="secondary" onClick={handleStartNew}>
                    Crear Otra
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return <CreationWizard />;
    }
  };

  return (
    <div>
      <PageHeader
        title="Crear Película"
        subtitle="Da vida a tu imaginación"
      />

      {renderContent()}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={{
          name: plan?.name || "Sin plan",
          movies_per_month: plan?.movies_per_month || 0,
        }}
        moviesCreated={profile.movies_created_this_month}
      />
    </div>
  );
}

