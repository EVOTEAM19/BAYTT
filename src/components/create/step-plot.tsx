"use client";

import { useCreationStore } from "@/stores/creation-store";
import { Textarea } from "@/components/ui/textarea";

export function StepPlot() {
  const { user_plot, setUserPlot } = useCreationStore();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          Trama detallada (Opcional)
        </h2>
        <p className="text-foreground-muted">
          Si tienes una trama más detallada, compártela aquí. Esto ayudará a crear
          un guión más preciso y coherente.
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={user_plot}
          onChange={(e) => setUserPlot(e.target.value)}
          placeholder="Ejemplo: La historia comienza cuando el científico, Dr. Elena Martínez, trabaja en su laboratorio secreto. Después de años de investigación, finalmente logra crear la fórmula. Sin embargo, cuando la prueba por primera vez, nota que su asistente desaparece. Al investigar, descubre que cada uso de la fórmula elimina a una persona al azar del mundo..."
          className="min-h-[250px] resize-none"
        />
        <div className="text-sm text-foreground-muted">
          {user_plot.length} caracteres
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-foreground-muted">
          <strong className="text-foreground">Recomendado:</strong> Incluir una
          trama detallada mejora significativamente la calidad del guión generado.
          Puedes describir el desarrollo de la historia, puntos clave, giros
          argumentales, etc.
        </p>
      </div>
    </div>
  );
}

