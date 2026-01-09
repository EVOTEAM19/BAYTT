"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Loader2 } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";

interface Voice {
  id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

interface VoiceSelectorProps {
  gender?: string;
  onSelect: (voice: { id: string; name: string } | null) => void;
  selected: { id: string; name: string } | null;
}

export function VoiceSelector({
  gender,
  onSelect,
  selected,
}: VoiceSelectorProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Obtener proveedor de audio activo
  const { data: audioProvider } = useQuery({
    queryKey: ["audio-provider"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.providers.list + "?type=audio");
      if (!response.ok) throw new Error("Failed to fetch providers");
      const data = await response.json();
      return data.data?.find((p: any) => p.is_active && p.is_default) || null;
    },
  });

  // Obtener voces disponibles (mock por ahora, se implementará con API real)
  const { data: voices = [], isLoading } = useQuery({
    queryKey: ["voices", audioProvider?.id, gender],
    queryFn: async () => {
      if (!audioProvider) return [];

      // Mock voices - en producción esto vendría de la API del proveedor
      const mockVoices: Voice[] = [
        { id: "voice-1", name: "James (Male)", category: "male" },
        { id: "voice-2", name: "Sarah (Female)", category: "female" },
        { id: "voice-3", name: "Michael (Male)", category: "male" },
        { id: "voice-4", name: "Emily (Female)", category: "female" },
        { id: "voice-5", name: "David (Male)", category: "male" },
        { id: "voice-6", name: "Jessica (Female)", category: "female" },
      ];

      // Filtrar por género si está especificado
      if (gender) {
        const genderFilter =
          gender === "male" ? "male" : gender === "female" ? "female" : null;
        return genderFilter
          ? mockVoices.filter((v) => v.category === genderFilter)
          : mockVoices;
      }

      return mockVoices;
    },
    enabled: !!audioProvider,
  });

  const filteredVoices = voices.filter((voice: Voice) =>
    voice.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePreview = async (voiceId: string) => {
    setPreviewingVoice(voiceId);
    // TODO: Implementar preview real con API
    setTimeout(() => {
      setPreviewingVoice(null);
      toast.success("Preview reproducido");
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Buscar Voz</Label>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre..."
          className="mt-1"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredVoices.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">
          <p>No se encontraron voces</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {filteredVoices.map((voice: Voice) => (
            <Card
              key={voice.id}
              className={`cursor-pointer transition-all ${
                selected?.id === voice.id
                  ? "ring-2 ring-primary bg-primary/10"
                  : "hover:bg-card-hover"
              }`}
              onClick={() => onSelect({ id: voice.id, name: voice.name })}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{voice.name}</p>
                    {voice.category && (
                      <p className="text-sm text-foreground-muted">
                        {voice.category}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(voice.id);
                      }}
                      disabled={previewingVoice === voice.id}
                    >
                      {previewingVoice === voice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    {selected?.id === voice.id && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="p-3 bg-primary/10 border border-primary rounded-lg">
          <p className="text-sm">
            <span className="font-semibold">Voz seleccionada:</span>{" "}
            {selected.name}
          </p>
        </div>
      )}
    </div>
  );
}

