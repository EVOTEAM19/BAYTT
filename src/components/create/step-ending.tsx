"use client";

import { useCreationStore } from "@/stores/creation-store";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StepEnding() {
  const { ending_type, user_ending, setEndingType, setUserEnding } =
    useCreationStore();

  const charCount = user_ending.length;
  const minChars = 20;
  const isValid = ending_type === "ai" || charCount >= minChars;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          ¿Cómo termina tu película?
        </h2>
        <p className="text-foreground-muted">
          Decide si quieres controlar el final o dejar que la IA lo cree
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          hover
          className={cn(
            "cursor-pointer transition-all",
            ending_type === "user" && "ring-2 ring-primary shadow-glow"
          )}
          onClick={() => setEndingType("user")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Wand2 className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">
                Yo decido el final
              </h3>
            </div>
            <p className="text-sm text-foreground-muted">
              Escribe cómo quieres que termine tu película
            </p>
          </CardContent>
        </Card>

        <Card
          hover
          className={cn(
            "cursor-pointer transition-all",
            ending_type === "ai" && "ring-2 ring-primary shadow-glow"
          )}
          onClick={() => setEndingType("ai")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">
                Sorpréndeme
              </h3>
            </div>
            <p className="text-sm text-foreground-muted">
              Deja que la IA cree un final sorprendente basado en tu historia
            </p>
          </CardContent>
        </Card>
      </div>

      {ending_type === "user" && (
        <div className="space-y-2">
          <Textarea
            value={user_ending}
            onChange={(e) => setUserEnding(e.target.value)}
            placeholder="Describe cómo quieres que termine tu película..."
            className="min-h-[150px] resize-none"
            error={
              charCount > 0 && !isValid
                ? `Mínimo ${minChars} caracteres (${charCount}/${minChars})`
                : undefined
            }
          />
          <div className="flex justify-between items-center text-sm">
            <span
              className={
                isValid
                  ? "text-success"
                  : charCount > 0
                  ? "text-error"
                  : "text-foreground-muted"
              }
            >
              {charCount} / {minChars} caracteres mínimo
            </span>
            {isValid && (
              <span className="text-success">✓ Final válido</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
