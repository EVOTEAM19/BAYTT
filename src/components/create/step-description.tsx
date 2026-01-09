"use client";

import { useCreationStore } from "@/stores/creation-store";
import { Textarea } from "@/components/ui/textarea";
import { useMemo } from "react";

export function StepDescription() {
  const { user_prompt, setUserPrompt } = useCreationStore();
  
  const charCount = user_prompt.length;
  const minChars = 50;
  const isValid = charCount >= minChars;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          ¿De qué trata tu película?
        </h2>
        <p className="text-foreground-muted">
          Describe la idea principal. Mientras más detalles, mejor será el resultado.
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={user_prompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Ejemplo: Un científico descubre una fórmula que puede detener el tiempo, pero cuando la usa, se da cuenta de que cada vez que la activa, alguien desaparece del mundo..."
          className="min-h-[200px] resize-none"
          error={
            charCount > 0 && !isValid
              ? `Mínimo ${minChars} caracteres (${charCount}/${minChars})`
              : undefined
          }
        />
        <div className="flex justify-between items-center text-sm">
          <span
            className={useMemo(
              () =>
                isValid
                  ? "text-success"
                  : charCount > 0
                  ? "text-error"
                  : "text-foreground-muted",
              [isValid, charCount]
            )}
          >
            {charCount} / {minChars} caracteres mínimo
          </span>
          {isValid && (
            <span className="text-success">✓ Descripción válida</span>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-foreground-muted">
          <strong className="text-foreground">Tip:</strong> Incluye detalles sobre
          personajes, ubicación, época, tono y cualquier elemento visual importante.
        </p>
      </div>
    </div>
  );
}
