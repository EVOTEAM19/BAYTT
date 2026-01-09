"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/formatters";
import { Edit, MoreHorizontal, Trash2, Eye, Volume2 } from "lucide-react";
import type { Character } from "@/types/database";

interface CharactersManagerProps {
  characters: Character[];
  isLoading?: boolean;
}

export function CharactersManager({
  characters,
  isLoading = false,
}: CharactersManagerProps) {
  const router = useRouter();
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);

  const handleDelete = async (characterId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este personaje?")) {
      return;
    }
    // TODO: Implementar eliminación
    alert("Eliminado (TODO: implementar)");
  };

  const handlePreviewVoice = async (characterId: string) => {
    // TODO: Implementar preview de voz
    setPreviewVoice(characterId);
    setTimeout(() => setPreviewVoice(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full" />
        ))}
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        <p>No hay personajes en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {characters.map((character) => (
        <Card
          key={character.id}
          className="group hover:shadow-card-hover transition-all cursor-pointer"
          onClick={() => router.push(`/admin/characters/${character.id}`)}
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-lg">
            <Image
              src={character.thumbnail_url || character.reference_images[0] || "/placeholder-character.jpg"}
              alt={character.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {character.is_premium && (
                <Badge variant="default" className="text-xs">
                  Premium
                </Badge>
              )}
              {character.is_active ? (
                <Badge variant="success" className="text-xs">
                  Activo
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Inactivo
                </Badge>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 text-white text-xs">
                <Volume2 className="h-3 w-3" />
                <span>{character.voice_name || "Sin voz"}</span>
              </div>
            </div>
          </div>
          <CardContent className="p-3">
            <h3 className="font-semibold text-foreground truncate mb-1">
              {character.name}
            </h3>
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span>Usos: {formatNumber(character.usage_count || 0)}</span>
              <DropdownMenu onClick={(e) => e.stopPropagation()}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/characters/${character.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalle
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/characters/${character.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewVoice(character.id);
                    }}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Escuchar Voz
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(character.id);
                    }}
                    className="text-error"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

