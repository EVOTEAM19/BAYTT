"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  labels: {
    gender?: string;
    age?: string;
    accent?: string;
    description?: string;
  };
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
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoices();
  }, [gender]);

  useEffect(() => {
    // Limpiar audio al desmontar
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [audio]);

  const fetchVoices = async () => {
    setIsLoading(true);
    try {
      const url = gender
        ? `/api/voices?gender=${gender}`
        : "/api/voices";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch voices");
      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error) {
      console.error("Error fetching voices:", error);
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const playPreview = (voice: Voice) => {
    if (audio) {
      audio.pause();
      audio.src = "";
    }

    if (playingId === voice.voice_id) {
      setPlayingId(null);
      setAudio(null);
      return;
    }

    const newAudio = new Audio(voice.preview_url);
    newAudio.onended = () => {
      setPlayingId(null);
      setAudio(null);
    };
    newAudio.onerror = () => {
      setPlayingId(null);
      setAudio(null);
    };
    newAudio.play().catch((error) => {
      console.error("Error playing audio:", error);
      setPlayingId(null);
      setAudio(null);
    });
    setAudio(newAudio);
    setPlayingId(voice.voice_id);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-foreground-muted">Cargando voces...</p>
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground-muted">
          No se encontraron voces disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted">
        Selecciona la voz que mejor represente a tu personaje. Esta voz será
        permanente para este personaje.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
        {voices.map((voice) => (
          <Card
            key={voice.voice_id}
            className={`cursor-pointer transition-all ${
              selected?.id === voice.voice_id
                ? "ring-2 ring-primary bg-primary/10"
                : "hover:bg-card-hover"
            }`}
            onClick={() =>
              onSelect({ id: voice.voice_id, name: voice.name })
            }
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playPreview(voice);
                  }}
                  className="shrink-0"
                >
                  {playingId === voice.voice_id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{voice.name}</h4>
                    {selected?.id === voice.voice_id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted mt-1">
                    {[
                      voice.labels.age,
                      voice.labels.accent,
                      voice.labels.description,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                  {voice.description && (
                    <p className="text-xs text-foreground-subtle mt-1 line-clamp-2">
                      {voice.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && (
        <div className="p-4 bg-success/20 border border-success rounded-lg">
          <p className="text-sm">
            <strong>Voz seleccionada:</strong> {selected.name}
          </p>
        </div>
      )}
    </div>
  );
}

