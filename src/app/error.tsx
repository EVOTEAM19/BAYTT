"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-error" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Algo salió mal
        </h1>
        <p className="text-foreground-muted">
          {error.message || "Ocurrió un error inesperado"}
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Intentar de nuevo</Button>
          <Button variant="secondary" onClick={() => window.location.href = "/"}>
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
