"use client";

import { useCreationStore } from "@/stores/creation-store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepDuration } from "./step-duration";
import { StepGenre } from "./step-genre";
import { StepDescription } from "./step-description";
import { StepPlot } from "./step-plot";
import { StepEnding } from "./step-ending";
import { StepCharacters } from "./step-characters";
import { StepReview } from "./step-review";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

const STEP_TITLES = [
  "Duración",
  "Género",
  "Descripción",
  "Trama",
  "Final",
  "Personajes",
  "Revisar",
];

export function CreationWizard() {
  const {
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    canProceedToNextStep,
    getStepValidation,
  } = useCreationStore();

  const progress = useMemo(
    () => (currentStep / totalSteps) * 100,
    [currentStep, totalSteps]
  );

  const validation = useMemo(
    () => getStepValidation(currentStep),
    [currentStep, getStepValidation]
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepDuration />;
      case 2:
        return <StepGenre />;
      case 3:
        return <StepDescription />;
      case 4:
        return <StepPlot />;
      case 5:
        return <StepEnding />;
      case 6:
        return <StepCharacters />;
      case 7:
        return <StepReview />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">
                  Crear Nueva Película
                </h1>
                <span className="text-sm text-foreground-muted">
                  Paso {currentStep} de {totalSteps}
                </span>
              </div>
              <Progress value={progress} showValue />
              <div className="flex items-center justify-between text-sm">
                {STEP_TITLES.map((title, index) => (
                  <div
                    key={index}
                    className={`flex-1 text-center ${
                      index + 1 === currentStep
                        ? "text-primary font-semibold"
                        : index + 1 < currentStep
                        ? "text-success"
                        : "text-foreground-muted"
                    }`}
                  >
                    {index + 1 < currentStep && "✓ "}
                    {title}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent className="p-8">{renderStep()}</CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < 7 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="secondary"
              onClick={previousStep}
              disabled={currentStep === 1}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Anterior
            </Button>

            <div className="flex-1" />

            <Button
              variant="default"
              onClick={nextStep}
              disabled={!canProceedToNextStep()}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Siguiente
            </Button>
          </div>
        )}

        {/* Validation Error */}
        {!validation.isValid && validation.error && (
          <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{validation.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
