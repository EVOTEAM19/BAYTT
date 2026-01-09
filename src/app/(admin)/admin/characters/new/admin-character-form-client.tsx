"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Upload, X, Volume2, Play, Loader2, RefreshCw } from "lucide-react";
import {
  CHARACTER_CATEGORIES,
  AGE_RANGES,
  GENDERS,
  ETHNICITIES,
  PERSONALITY_TRAITS,
} from "@/types/character";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";
import type { Character, ApiProvider } from "@/types/database";

const characterFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  category: z.enum([
    "protagonist",
    "antagonist",
    "secondary",
    "professional",
    "fantasy",
    "child",
  ]),
  description: z.string().optional(),
  age_range: z.string().optional(),
  gender: z.string().optional(),
  ethnicity: z.string().optional(),
  body_type: z.string().optional(),
  personality_traits: z.array(z.string()).optional(),
  reference_images: z.array(z.string()).min(5, "Mínimo 5 imágenes requeridas"),
  voice_provider_id: z.string().optional(),
  voice_id: z.string().optional(),
  voice_name: z.string().optional(),
  visual_prompt_base: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_premium: z.boolean(),
  is_active: z.boolean(),
  is_baytt_character: z.boolean(),
});

type CharacterFormData = z.infer<typeof characterFormSchema>;

interface AdminCharacterFormClientProps {
  audioProviders: ApiProvider[];
  character: Character | null;
}

export function AdminCharacterFormClient({
  audioProviders,
  character,
}: AdminCharacterFormClientProps) {
  const router = useRouter();
  const isEditing = !!character;
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    character?.reference_images || []
  );
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedProvider, setSelectedProvider] = useState<string>(
    character?.voice_provider_id || ""
  );
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [regeneratingLoraImages, setRegeneratingLoraImages] = useState(false);
  const [loraTestImages, setLoraTestImages] = useState<string[]>([]);
  
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CharacterFormData>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: {
      name: character?.name || "",
      category: character?.category || "protagonist",
      description: "",
      age_range: "",
      gender: "",
      ethnicity: "",
      body_type: "",
      personality_traits: [],
      reference_images: character?.reference_images || [],
      voice_provider_id: character?.voice_provider_id || "",
      voice_id: character?.voice_id || "",
      voice_name: character?.voice_name || "",
      visual_prompt_base: character?.visual_prompt_base || "",
      tags: character?.tags || [],
      is_premium: character?.is_premium ?? false,
      is_active: character?.is_active ?? true,
      is_baytt_character: character?.is_baytt_character ?? true,
    },
  });

  const watchedCategory = watch("category");
  const watchedVoiceProvider = watch("voice_provider_id");
  const watchedVoiceId = watch("voice_id");

  // Cargar voces cuando se selecciona un proveedor
  useEffect(() => {
    // Inicializar selectedProvider con el del personaje si existe
    if (character?.voice_provider_id && !selectedProvider) {
      setSelectedProvider(character.voice_provider_id);
      setValue("voice_provider_id", character.voice_provider_id);
    }
    
    if (selectedProvider && selectedProvider !== "") {
      loadVoices(selectedProvider);
    }
  }, [selectedProvider, character?.voice_provider_id]);

  const loadVoices = async (providerId: string) => {
    if (!providerId || providerId === "undefined" || providerId === "") {
      console.warn("[LOAD VOICES] Provider ID is invalid:", providerId);
      setAvailableVoices([]);
      return;
    }
    
    setLoadingVoices(true);
    try {
      const response = await fetch(
        `/api/providers/${providerId}/voices`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableVoices(data.voices || []);
      } else {
        console.error("[LOAD VOICES] Error response:", response.status, response.statusText);
        // Mock data para desarrollo solo si falla
        setAvailableVoices([
          { id: "voice1", name: "Voz Masculina 1" },
          { id: "voice2", name: "Voz Femenina 1" },
          { id: "voice3", name: "Voz Neutra 1" },
        ]);
      }
    } catch (error) {
      console.error("Error loading voices:", error);
      toast.error("Error al cargar voces");
    } finally {
      setLoadingVoices(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    const newFiles = Array.from(files);
    const totalFiles = uploadedImages.length + newFiles.length;

    if (totalFiles > 20) {
      toast.error("Máximo 20 imágenes");
      return;
    }

    for (const file of newFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "character-reference");

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        setUploadedImages((prev) => [...prev, data.url]);
        setValue("reference_images", [...uploadedImages, data.url]);
      } catch (error) {
        toast.error(`Error al subir ${file.name}`);
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setValue("reference_images", newImages);
  };

  // Extraer datos del personaje al cargar (metadata, imágenes LoRA, etc.)
  useEffect(() => {
    if (character) {
      // Cargar imágenes de referencia
      if (character.reference_images && character.reference_images.length > 0) {
        setUploadedImages(character.reference_images);
        setValue("reference_images", character.reference_images);
      }

      // Extraer metadata del description
      let extractedPhysical: any = {};
      let extractedWardrobe: any = {};
      
      if (character.description) {
        const metadataMatch = character.description.match(/<!-- METADATA: ({.*?}) -->/);
        if (metadataMatch) {
          try {
            const metadata = JSON.parse(metadataMatch[1]);
            
            // Extraer physical_traits
            if (metadata.physical_traits) {
              extractedPhysical = metadata.physical_traits;
              // Cargar en el formulario si los campos existen
              if (metadata.physical_traits.exact_age) setValue("age_range", `${metadata.physical_traits.exact_age}`);
              if (metadata.physical_traits.body_type) setValue("body_type", metadata.physical_traits.body_type);
            }
            
            // Extraer wardrobe
            if (metadata.wardrobe) {
              extractedWardrobe = metadata.wardrobe;
            }
            
            // Extraer imágenes LoRA
            if (metadata.lora_test_image_urls && Array.isArray(metadata.lora_test_image_urls)) {
              setLoraTestImages(metadata.lora_test_image_urls);
            }
          } catch (e) {
            console.error("Error parsing metadata:", e);
          }
        }
        
        // Extraer description sin metadata
        const cleanDescription = character.description.replace(/<!-- METADATA: ({.*?}) -->/, "").trim();
        if (cleanDescription) {
          setValue("description", cleanDescription);
          setValue("visual_prompt_base", cleanDescription); // También como prompt visual
        }
      }
      
      // Cargar otros campos
      if (character.visual_prompt_base) {
        setValue("visual_prompt_base", character.visual_prompt_base);
      }
    }
  }, [character, setValue]);

  // Regenerar imágenes de prueba del LoRA
  const handleRegenerateLoraImages = async () => {
    if (!character?.lora_model_url || !character?.lora_trigger_word) {
      toast({
        title: "Error",
        description: "El personaje debe tener un modelo LoRA entrenado",
        variant: "error",
      });
      return;
    }

    setRegeneratingLoraImages(true);
    try {
      // Extraer physical_traits y wardrobe del metadata si existen
      let physicalTraits: any = {};
      let wardrobeData: any = {};
      let visualPromptBase = character.visual_prompt_base || "";

      if (character.description) {
        const metadataMatch = character.description.match(/<!-- METADATA: ({.*?}) -->/);
        if (metadataMatch) {
          try {
            const metadata = JSON.parse(metadataMatch[1]);
            physicalTraits = metadata.physical_traits || {};
            wardrobeData = metadata.wardrobe || {};
          } catch (e) {
            console.error("[REGENERATE LORA IMAGES] Error parsing metadata:", e);
          }
        }
      }

      // Asegurar que gender esté incluido en physical_traits (necesario para buildPhotorealisticPrompt)
      if (!physicalTraits.gender && character.gender) {
        physicalTraits.gender = character.gender;
      }

      // Generar nuevas imágenes con toda la información del personaje
      const generateResponse = await fetch("/api/characters/generate-lora-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lora_model_url: character.lora_model_url,
          trigger_word: character.lora_trigger_word,
          character_name: character.name,
          character_id: character.id, // Pasar ID para obtener toda la info del personaje
          physical_traits: physicalTraits, // Pasar características físicas
          wardrobe: wardrobeData, // Pasar vestuario
          visual_prompt_base: visualPromptBase, // Pasar prompt visual base
        }),
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        throw new Error(error.error || "Error al generar imágenes");
      }

      const generateData = await generateResponse.json();
      const newImageUrls = generateData.image_urls || [];

      if (newImageUrls.length === 0) {
        throw new Error("No se generaron imágenes");
      }

      // Actualizar el personaje con las nuevas imágenes
      // Primero, obtener el metadata actual
      let currentDescription = character.description || "";
      const metadataMatch = currentDescription.match(/<!-- METADATA: ({.*?}) -->/);
      let metadata: any = {};
      
      if (metadataMatch) {
        try {
          metadata = JSON.parse(metadataMatch[1]);
        } catch (e) {
          console.error("Error parsing existing metadata:", e);
        }
        // Remover el metadata anterior del description
        currentDescription = currentDescription.replace(/<!-- METADATA: ({.*?}) -->/, "").trim();
      }

      // Actualizar el metadata con las nuevas imágenes
      metadata.lora_test_image_urls = newImageUrls;
      
      // Añadir el metadata actualizado
      const updatedDescription = currentDescription 
        ? `${currentDescription}\n\n<!-- METADATA: ${JSON.stringify(metadata)} -->`
        : `<!-- METADATA: ${JSON.stringify(metadata)} -->`;

      // Actualizar el personaje
      const updateResponse = await fetch(`/api/admin/characters/${character.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: updatedDescription,
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || "Error al actualizar el personaje");
      }

      // Actualizar el estado local
      setLoraTestImages(newImageUrls);
      
      toast({
        title: "✅ Imágenes regeneradas",
        description: `Se generaron ${newImageUrls.length} nuevas imágenes con LoRA`,
        variant: "success",
      });

      // Recargar la página para mostrar las nuevas imágenes
      router.refresh();
    } catch (error: any) {
      console.error("[REGENERATE LORA IMAGES] Error:", error);
      toast({
        title: "Error",
        description: error.message || "Error al regenerar imágenes",
        variant: "error",
      });
    } finally {
      setRegeneratingLoraImages(false);
    }
  };

  const handlePreviewVoice = async (voiceId: string) => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }

    setPreviewingVoice(voiceId);
    try {
      // TODO: Llamar a API para generar preview de voz
        // TODO: Implementar endpoint de preview de voz
        const response = await fetch(
          `/api/providers/${selectedProvider}/voices/${voiceId}/preview`
        );
      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        setPreviewAudio(audio);
        audio.play();
        audio.onended = () => setPreviewingVoice(null);
      } else {
        toast.error("Error al generar preview de voz");
        setPreviewingVoice(null);
      }
    } catch (error) {
      toast.error("Error al generar preview de voz");
      setPreviewingVoice(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: CharacterFormData) => {
      const url = isEditing
        ? `/api/admin/characters/${character.id}`
        : "/api/admin/characters";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save character");
      return response.json();
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Personaje actualizado correctamente"
          : "Personaje creado correctamente"
      );
      router.push("/admin/characters");
    },
    onError: () => {
      toast.error("Error al guardar el personaje");
    },
  });

  const onSubmit = handleSubmit((data: CharacterFormData) => {
    saveMutation.mutate({
      ...data,
      reference_images: uploadedImages,
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/characters")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={isEditing ? "Editar Personaje" : "Nuevo Personaje"}
          subtitle={
            isEditing
              ? "Modifica la información del personaje"
              : "Crea un nuevo personaje para la plataforma"
          }
        />
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register("name")}
                error={errors.name?.message}
              />
            </div>

            <div>
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value as any)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTER_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                {...register("description")}
                rows={3}
                placeholder="Descripción del personaje..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Physical Attributes */}
        <Card>
          <CardHeader>
            <CardTitle>Atributos Físicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age_range">Rango de Edad</Label>
                <Select
                  value={watch("age_range") || ""}
                  onValueChange={(value) => setValue("age_range", value)}
                >
                  <SelectTrigger id="age_range">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((range) => (
                      <SelectItem key={range.id} value={range.id}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={watch("gender") || ""}
                  onValueChange={(value) => setValue("gender", value)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((gender) => (
                      <SelectItem key={gender.id} value={gender.id}>
                        {gender.icon} {gender.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ethnicity">Etnia</Label>
                <Select
                  value={watch("ethnicity") || ""}
                  onValueChange={(value) => setValue("ethnicity", value)}
                >
                  <SelectTrigger id="ethnicity">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {ETHNICITIES.map((ethnicity) => (
                      <SelectItem key={ethnicity.id} value={ethnicity.id}>
                        {ethnicity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="body_type">Tipo de Cuerpo</Label>
                <Input
                  id="body_type"
                  {...register("body_type")}
                  placeholder="Ej: Delgado, Atlético, Robusto..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personality */}
        <Card>
          <CardHeader>
            <CardTitle>Personalidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Rasgos de Personalidad</Label>
              <div className="flex flex-wrap gap-2">
                {PERSONALITY_TRAITS.map((trait) => {
                  const selected = watch("personality_traits")?.includes(trait.id) || false;
                  return (
                    <Badge
                      key={trait.id}
                      variant={selected ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = watch("personality_traits") || [];
                        const newTraits = selected
                          ? current.filter((t) => t !== trait.id)
                          : [...current, trait.id];
                        setValue("personality_traits", newTraits);
                      }}
                    >
                      {trait.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reference Images */}
        <Card>
          <CardHeader>
            <CardTitle>Imágenes de Referencia *</CardTitle>
            <p className="text-sm text-foreground-muted">
              Mínimo 5 imágenes requeridas ({uploadedImages.length}/5)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {uploadedImages.map((url, index) => (
                <div key={index} className="relative aspect-square group">
                  <Image
                    src={url}
                    alt={`Reference ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              {uploadedImages.length < 20 && (
                <label className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-8 w-8 text-foreground-muted" />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  />
                </label>
              )}
            </div>
            {errors.reference_images && (
              <p className="text-sm text-error">
                {errors.reference_images.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Especificaciones del Personaje (si existe) */}
        {character && (() => {
          // Extraer metadata para mostrar
          let physicalTraits: any = {};
          let wardrobeData: any = {};
          
          if (character.description) {
            const metadataMatch = character.description.match(/<!-- METADATA: ({.*?}) -->/);
            if (metadataMatch) {
              try {
                const metadata = JSON.parse(metadataMatch[1]);
                physicalTraits = metadata.physical_traits || {};
                wardrobeData = metadata.wardrobe || {};
              } catch (e) {
                // Ignorar errores de parsing
              }
            }
          }
          
          return Object.keys(physicalTraits).length > 0 || Object.keys(wardrobeData).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Especificaciones del Personaje</CardTitle>
                <p className="text-sm text-foreground-muted">
                  Características físicas y vestimenta guardadas
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Características Físicas */}
                {Object.keys(physicalTraits).length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Características Físicas</Label>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {physicalTraits.exact_age && (
                        <div>
                          <span className="text-foreground-muted">Edad:</span>{" "}
                          <span className="font-medium">{physicalTraits.exact_age} años</span>
                        </div>
                      )}
                      {physicalTraits.height_cm && (
                        <div>
                          <span className="text-foreground-muted">Altura:</span>{" "}
                          <span className="font-medium">{physicalTraits.height_cm} cm</span>
                        </div>
                      )}
                      {physicalTraits.weight_kg && (
                        <div>
                          <span className="text-foreground-muted">Peso:</span>{" "}
                          <span className="font-medium">{physicalTraits.weight_kg} kg</span>
                        </div>
                      )}
                      {physicalTraits.body_type && (
                        <div>
                          <span className="text-foreground-muted">Tipo de cuerpo:</span>{" "}
                          <span className="font-medium">{physicalTraits.body_type}</span>
                        </div>
                      )}
                      {physicalTraits.skin_tone && (
                        <div>
                          <span className="text-foreground-muted">Tono de piel:</span>{" "}
                          <span className="font-medium">{physicalTraits.skin_tone}</span>
                        </div>
                      )}
                      {physicalTraits.face_shape && (
                        <div>
                          <span className="text-foreground-muted">Forma del rostro:</span>{" "}
                          <span className="font-medium">{physicalTraits.face_shape}</span>
                        </div>
                      )}
                      {physicalTraits.eye_color && (
                        <div>
                          <span className="text-foreground-muted">Color de ojos:</span>{" "}
                          <span className="font-medium">{physicalTraits.eye_color}</span>
                        </div>
                      )}
                      {physicalTraits.hair_color && (
                        <div>
                          <span className="text-foreground-muted">Color de cabello:</span>{" "}
                          <span className="font-medium">{physicalTraits.hair_color}</span>
                        </div>
                      )}
                      {physicalTraits.hair_style && (
                        <div>
                          <span className="text-foreground-muted">Estilo de cabello:</span>{" "}
                          <span className="font-medium">{physicalTraits.hair_style}</span>
                        </div>
                      )}
                      {physicalTraits.hair_length && (
                        <div>
                          <span className="text-foreground-muted">Largo de cabello:</span>{" "}
                          <span className="font-medium">{physicalTraits.hair_length}</span>
                        </div>
                      )}
                      {physicalTraits.facial_hair && (
                        <div>
                          <span className="text-foreground-muted">Vello facial:</span>{" "}
                          <span className="font-medium">{physicalTraits.facial_hair}</span>
                        </div>
                      )}
                      {physicalTraits.distinctive_marks && physicalTraits.distinctive_marks.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-foreground-muted">Rasgos distintivos:</span>{" "}
                          <span className="font-medium">{physicalTraits.distinctive_marks.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Vestimenta */}
                {wardrobeData?.default_outfit && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Vestimenta</Label>
                    <div className="text-sm">
                      <span className="text-foreground-muted">Outfit por defecto:</span>{" "}
                      <span className="font-medium">{wardrobeData.default_outfit}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null;
        })()}

        {/* LoRA Model Info (si existe) */}
        {character?.lora_model_url && (
          <Card>
            <CardHeader>
              <CardTitle>Modelo LoRA Entrenado</CardTitle>
              <p className="text-sm text-foreground-muted">
                Este personaje tiene un modelo LoRA entrenado
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL del Modelo</Label>
                <div className="p-3 bg-background-secondary rounded-lg">
                  <code className="text-sm text-foreground-muted break-all">
                    {character.lora_model_url}
                  </code>
                </div>
              </div>
              {character.lora_trigger_word && (
                <div className="space-y-2">
                  <Label>Trigger Word</Label>
                  <div className="p-3 bg-background-secondary rounded-lg">
                    <code className="text-sm font-mono">{character.lora_trigger_word}</code>
                  </div>
                </div>
              )}
              {/* Mostrar imágenes generadas con LoRA (test images) si están disponibles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Imágenes Generadas con LoRA
                    {loraTestImages.length > 0 && ` (${loraTestImages.length} imágenes)`}
                  </Label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRegenerateLoraImages}
                    disabled={regeneratingLoraImages || !character?.lora_model_url}
                  >
                    {regeneratingLoraImages ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerar Imágenes
                      </>
                    )}
                  </Button>
                </div>
                
                {loraTestImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {loraTestImages.map((url, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={url}
                          alt={`${character.name} - LoRA Test ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-background-secondary rounded-lg text-center text-foreground-muted">
                    <p className="text-sm">
                      No hay imágenes de prueba generadas. Haz clic en "Regenerar Imágenes" para generar nuevas imágenes usando el modelo LoRA.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice */}
        <Card>
          <CardHeader>
            <CardTitle>Voz del Personaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="voice_provider">Proveedor de Voz</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => {
                  setSelectedProvider(value);
                  setValue("voice_provider_id", value);
                  setValue("voice_id", "");
                  setValue("voice_name", "");
                }}
              >
                <SelectTrigger id="voice_provider">
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {audioProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProvider && (
              <div>
                <Label htmlFor="voice_id">Voz</Label>
                {loadingVoices ? (
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando voces...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={watchedVoiceId || ""}
                      onValueChange={(value) => {
                        const voice = availableVoices.find((v) => v.id === value);
                        setValue("voice_id", value);
                        setValue("voice_name", voice?.name || "");
                      }}
                    >
                      <SelectTrigger id="voice_id">
                        <SelectValue placeholder="Selecciona una voz" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchedVoiceId && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreviewVoice(watchedVoiceId)}
                        disabled={previewingVoice === watchedVoiceId}
                      >
                        {previewingVoice === watchedVoiceId ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4 mr-2" />
                            Escuchar Muestra
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt Visual Base</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("visual_prompt_base")}
              rows={4}
              placeholder="Descripción visual detallada del personaje para generación de IA..."
            />
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Escribe tags separados por comas..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value) {
                    const currentTags = watch("tags") || [];
                    setValue("tags", [...currentTags, value]);
                    e.currentTarget.value = "";
                  }
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {watch("tags")?.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => {
                    const newTags = watch("tags")?.filter((_, i) => i !== index) || [];
                    setValue("tags", newTags);
                  }}
                >
                  {tag} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_premium">Personaje Premium</Label>
                <p className="text-sm text-foreground-muted">
                  Solo disponible para planes premium
                </p>
              </div>
              <Switch
                id="is_premium"
                checked={watch("is_premium")}
                onCheckedChange={(checked) => setValue("is_premium", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">Activo</Label>
                <p className="text-sm text-foreground-muted">
                  Visible en la plataforma
                </p>
              </div>
              <Switch
                id="is_active"
                checked={watch("is_active")}
                onCheckedChange={(checked) => setValue("is_active", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_baytt_character">Personaje BAYTT</Label>
                <p className="text-sm text-foreground-muted">
                  Marca si es un personaje oficial de BAYTT (vs. personaje real)
                </p>
              </div>
              <Switch
                id="is_baytt_character"
                checked={watch("is_baytt_character")}
                onCheckedChange={(checked) => setValue("is_baytt_character", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/admin/characters")}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || saveMutation.isPending}
          >
            {isSubmitting || saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Personaje"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

