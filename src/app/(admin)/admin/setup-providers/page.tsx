"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Settings } from "lucide-react";

export default function SetupProvidersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const setupProviders = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      const response = await fetch("/api/admin/setup-providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al configurar proveedores");
      }

      setResults(data.results || []);
      
      const successCount = data.results.filter((r: any) => r.status !== 'error').length;
      const errorCount = data.results.filter((r: any) => r.status === 'error').length;

      toast({
        title: "✅ Configuración completada",
        description: `${successCount} proveedores configurados correctamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-app py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Proveedores
          </CardTitle>
          <CardDescription>
            Configura automáticamente los proveedores: Runway, OpenAI, ElevenLabs y Sync Labs con sus API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Proveedores a configurar:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-foreground-muted">
              <li>Runway Gen-3 Alpha Turbo (Video)</li>
              <li>OpenAI GPT-4 Turbo (LLM)</li>
              <li>ElevenLabs (Audio/Voz)</li>
              <li>Sync Labs (Lip Sync)</li>
            </ul>
          </div>

          <Button
            onClick={setupProviders}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configurando proveedores...
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Configurar Proveedores
              </>
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Resultados:</h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border flex items-center gap-2 ${
                      result.status === "error"
                        ? "bg-error/10 border-error"
                        : result.status === "created"
                        ? "bg-success/10 border-success"
                        : "bg-primary/10 border-primary"
                    }`}
                  >
                    {result.status === "error" ? (
                      <XCircle className="h-5 w-5 text-error" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{result.provider}</p>
                      <p className="text-sm text-foreground-muted">
                        {result.message}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-background-secondary">
                      {result.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
