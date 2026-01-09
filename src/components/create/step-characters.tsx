"use client";

import { useCreationStore } from "@/stores/creation-store";
import { useCharacters } from "@/hooks/use-characters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Check, X, Sparkles, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CHARACTER_CATEGORIES } from "@/types/character";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type CharacterMode = "random" | "library" | null;

export function StepCharacters() {
  const { 
    character_ids, 
    setCharacterIds,
    use_random_characters,
    setUseRandomCharacters,
    random_characters_count,
    setRandomCharactersCount,
    user_prompt,
    user_plot,
    genre
  } = useCreationStore();
  
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Por defecto, modo aleatorio está activo
  const [mode, setMode] = useState<CharacterMode>(use_random_characters ? "random" : character_ids.length > 0 ? "library" : "random");
  const [generatingRandom, setGeneratingRandom] = useState(false);
  const [generatedRandomCharacters, setGeneratedRandomCharacters] = useState<any[]>([]);
  
  const { data: characters = [], isLoading } = useCharacters({
    category: selectedCategory || undefined,
  });

  const toggleCharacter = (characterId: string) => {
    if (character_ids.includes(characterId)) {
      setCharacterIds(character_ids.filter((id) => id !== characterId));
    } else {
      setCharacterIds([...character_ids, characterId]);
    }
  };

  // Generar personajes aleatorios basados en el prompt/guion
  const generateRandomCharacters = async () => {
    if (!user_prompt || user_prompt.length < 20) {
      toast({
        title: "Prompt insuficiente",
        description: "Necesitas al menos 20 caracteres en la descripción para generar personajes",
        variant: "error"
      });
      return;
    }

    setGeneratingRandom(true);
    setMode("random");
    setUseRandomCharacters(true);

    try {
      const response = await fetch('/api/characters/generate-from-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_prompt,
          user_plot,
          genre,
          count: random_characters_count || 3
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar personajes');
      }

      const { characters } = await response.json();
      setGeneratedRandomCharacters(characters);

      toast({
        title: '✅ Personajes generados',
        description: `Se generaron ${characters.length} personajes aleatorios`,
        variant: 'success'
      });

    } catch (err: any) {
      toast({
        title: 'Error al generar',
        description: err.message,
        variant: 'error'
      });
      setMode(null);
      setUseRandomCharacters(false);
    } finally {
      setGeneratingRandom(false);
    }
  };

  // Ya no necesitamos estas funciones porque ambos modos pueden estar activos

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          Personajes de la Película
        </h2>
        <p className="text-foreground-muted">
          Genera personajes aleatorios basados en tu historia o selecciona de la librería
        </p>
      </div>

      {/* Selector de modo - Ahora permite ambos modos simultáneamente */}
      <div className="space-y-4">
        {/* Personajes Aleatorios - Siempre disponible */}
        <Card 
          className={cn(
            "transition-all",
            use_random_characters && "ring-2 ring-primary shadow-glow"
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Personajes Aleatorios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use-random"
                  checked={use_random_characters}
                  onChange={(e) => {
                    setUseRandomCharacters(e.target.checked);
                    if (e.target.checked) {
                      setMode("random");
                    }
                  }}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="use-random" className="text-sm text-foreground cursor-pointer">
                  Generar personajes aleatorios basados en tu historia
                </label>
              </div>
              
              {use_random_characters && (
                <div className="space-y-3 pl-8">
                  <InputWrapper
                    label="Número de personajes aleatorios"
                    type="number"
                    min="1"
                    max="10"
                    value={random_characters_count.toString()}
                    onChange={(e) => setRandomCharactersCount(parseInt(e.target.value) || 3)}
                  />
                  <Button
                    onClick={generateRandomCharacters}
                    disabled={generatingRandom || !user_prompt || user_prompt.length < 20}
                    className="w-full"
                    size="lg"
                  >
                    {generatingRandom ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar Personajes Aleatorios
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selección de Librería - Disponible además de los aleatorios */}
        <Card 
          className={cn(
            "transition-all",
            character_ids.length > 0 && "ring-2 ring-primary shadow-glow"
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Seleccionar Personajes de la Librería
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground-muted mb-4">
              Puedes seleccionar personajes específicos de la librería además de los aleatorios.
              Se mostrarán tanto personajes de BAYTT como los que hayas creado.
            </p>
            <Button
              onClick={() => {
                setMode("library");
                if (!use_random_characters) {
                  setUseRandomCharacters(false);
                }
              }}
              variant={mode === "library" ? "default" : "outline"}
              className="w-full"
            >
              {mode === "library" ? "Ocultar Librería" : "Mostrar Librería"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Vista de personajes aleatorios generados */}
      {mode === "random" && generatedRandomCharacters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personajes Generados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedRandomCharacters.map((char, index) => (
                <Card key={index} className="bg-card-hover">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{char.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {CHARACTER_CATEGORIES.find(c => c.id === char.category)?.name || char.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground-muted line-clamp-2">
                        {char.description}
                      </p>
                      <div className="flex flex-wrap gap-1 text-xs text-foreground-muted">
                        <span>{char.physical?.exact_age} años</span>
                        <span>•</span>
                        <span>{char.physical?.gender === 'male' ? '👨' : char.physical?.gender === 'female' ? '👩' : '🧑'}</span>
                        <span>•</span>
                        <span>{char.physical?.height_cm}cm</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-foreground-muted">
              Estos personajes se crearán automáticamente cuando generes la película
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de librería - Disponible siempre que se active */}
      {mode === "library" && (
        <>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-card-hover border border-border"
              )}
            >
              Todos
            </button>
            {CHARACTER_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-card-hover border border-border"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Characters Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-foreground-muted">
              Cargando personajes...
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-12 text-foreground-muted">
              No hay personajes disponibles en esta categoría
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((character) => {
                const isSelected = character_ids.includes(character.id);

                return (
                  <Card
                    key={character.id}
                    className={cn(
                      "cursor-pointer transition-all relative",
                      isSelected && "ring-2 ring-primary shadow-glow"
                    )}
                    onClick={() => toggleCharacter(character.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={character.thumbnail_url || undefined} />
                          <AvatarFallback>
                            {character.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {character.name}
                            </h3>
                            {isSelected ? (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <X className="h-4 w-4 text-foreground-muted flex-shrink-0" />
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {CHARACTER_CATEGORIES.find(
                              (c) => c.id === character.category
                            )?.name || character.category}
                          </Badge>
                          {character.is_premium && (
                            <Badge variant="default" className="ml-2 text-xs">
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {character_ids.length > 0 && (
            <div className="text-center text-sm text-foreground-muted">
              {character_ids.length} personaje{character_ids.length !== 1 ? "s" : ""}{" "}
              seleccionado{character_ids.length !== 1 ? "s" : ""}
            </div>
          )}
        </>
      )}

      {/* Resumen de selección */}
      {(use_random_characters || character_ids.length > 0) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Resumen de Personajes:</p>
              {use_random_characters && (
                <p className="text-sm text-foreground-muted">
                  ✓ Se generarán {random_characters_count} personaje{random_characters_count !== 1 ? 's' : ''} aleatorio{random_characters_count !== 1 ? 's' : ''} basado{random_characters_count !== 1 ? 's' : ''} en tu historia
                </p>
              )}
              {character_ids.length > 0 && (
                <p className="text-sm text-foreground-muted">
                  ✓ {character_ids.length} personaje{character_ids.length !== 1 ? 's' : ''} seleccionado{character_ids.length !== 1 ? 's' : ''} de la librería
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
