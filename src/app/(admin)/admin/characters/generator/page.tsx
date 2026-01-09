"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  RefreshCw,
  Save,
  ImagePlus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  User,
  Palette,
  Camera,
  Mic,
  Download,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { SelectWrapper } from "@/components/ui/select-wrapper";
import { TextareaWrapper } from "@/components/ui/textarea-wrapper";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

import {
  CHARACTER_CATEGORIES,
  GENDERS,
  AGE_RANGES,
  BODY_TYPES,
  FACE_SHAPES,
  EYE_SHAPES,
  HAIR_LENGTHS,
  ETHNICITIES,
} from "@/types/character";
import { VoiceSelector } from "@/components/admin/voice-selector";

// Estado inicial del personaje
const initialCharacter = {
  name: "",
  category: "",
  gender: "",
  description: "",
  physical: {
    exact_age: 30,
    height_cm: 170,
    weight_kg: 70,
    body_type: "average",
    build: "",
    face_shape: "oval",
    skin_tone: "",
    eye_color: "",
    eye_shape: "almond",
    eyebrows: "",
    hair_color: "",
    hair_style: "",
    hair_length: "short",
    hair_texture: "",
    facial_hair: "",
    nose_shape: "",
    lips: "",
    jawline: "",
    cheekbones: "",
    distinctive_marks: [] as string[],
    tattoos: [] as string[],
    scars: [] as string[],
    posture: "",
    ethnicity: "",
  },
  personality: {
    primary_traits: [] as string[],
    secondary_traits: [] as string[],
    flaws: [] as string[],
    speech_pattern: "",
  },
  wardrobe: {
    default_outfit: "",
    formal_outfit: "",
    casual_outfit: "",
    color_palette: [] as string[],
  },
};

export default function CharacterGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Estados
  const [character, setCharacter] = useState(initialCharacter);
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{
      url: string;
      seed: number;
      pose: string;
      selected: boolean;
    }>
  >([]);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGeneratingTraits, setIsGeneratingTraits] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isTrainingLoRA, setIsTrainingLoRA] = useState(false);
  const [loraProgress, setLoraProgress] = useState(0);
  const [trainedLora, setTrainedLora] = useState<{
    url: string;
    trigger: string;
  } | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Pasos del wizard
  const steps = [
    { id: "basic", title: "Básico", icon: User },
    { id: "physical", title: "Físico", icon: User },
    { id: "face", title: "Rostro", icon: User },
    { id: "style", title: "Estilo", icon: Palette },
    { id: "images", title: "Imágenes", icon: Camera },
    { id: "voice", title: "Voz", icon: Mic },
    { id: "review", title: "Revisar", icon: Check },
  ];

  // Actualizar campo físico
  const updatePhysical = (field: string, value: any) => {
    setCharacter((prev) => ({
      ...prev,
      physical: { ...prev.physical, [field]: value },
    }));
  };

  // Generar características con IA
  const generateRandomTraits = async () => {
    if (!character.category || !character.gender) {
      toast.error("Selecciona categoría y género primero");
      return;
    }

    setIsGeneratingTraits(true);
    try {
      const response = await fetch("/api/characters/generate-traits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: character.category,
          gender: character.gender,
          age_range:
            character.physical.exact_age < 18
              ? "teen"
              : character.physical.exact_age < 30
              ? "young_adult"
              : character.physical.exact_age < 50
              ? "adult"
              : "senior",
        }),
      });

      if (!response.ok) throw new Error("Failed to generate traits");

      const traits = await response.json();
      setCharacter((prev) => ({
        ...prev,
        name: traits.name || prev.name,
        physical: { ...prev.physical, ...traits.physical },
        personality: traits.personality || prev.personality,
        wardrobe: traits.wardrobe || prev.wardrobe,
      }));

      toast.success("✨ Características generadas");
    } catch (error) {
      toast.error("Error al generar características");
    } finally {
      setIsGeneratingTraits(false);
    }
  };

  // Generar imágenes con Flux
  const generateImages = async () => {
    setIsGeneratingImages(true);
    setGeneratedImages([]);

    try {
      const response = await fetch("/api/characters/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          physical: character.physical,
          wardrobe: character.wardrobe,
          poses: [
            "portrait",
            "portrait",
            "three_quarter",
            "three_quarter",
            "profile",
            "full_body",
            "portrait",
            "portrait",
          ],
          expressions: [
            "neutral",
            "happy",
            "neutral",
            "serious",
            "neutral",
            "neutral",
            "thoughtful",
            "serious",
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to generate images");

      const { images, prompt } = await response.json();
      setGeneratedImages(
        images.map((img: any) => ({ ...img, selected: false }))
      );
      setGeneratedPrompt(prompt);

      toast.success(`🖼️ ${images.length} imágenes generadas`);
    } catch (error) {
      toast.error("Error al generar imágenes");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Toggle selección de imagen
  const toggleImageSelection = (index: number) => {
    setGeneratedImages((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, selected: !img.selected } : img
      )
    );
  };

  // Entrenar LoRA
  const trainLoRA = async () => {
    const selectedImages = generatedImages.filter((img) => img.selected);
    if (selectedImages.length < 8) {
      toast.error("Selecciona al menos 8 imágenes");
      return;
    }

    setIsTrainingLoRA(true);
    setLoraProgress(0);

    try {
      // Simular progreso mientras entrena
      const progressInterval = setInterval(() => {
        setLoraProgress((prev) => Math.min(prev + 2, 95));
      }, 3000);

      const response = await fetch("/api/characters/train-lora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_name: character.name,
          images: selectedImages.map((img) => img.url),
        }),
      });

      clearInterval(progressInterval);
      setLoraProgress(100);

      if (!response.ok) throw new Error("Failed to train LoRA");

      const result = await response.json();
      setTrainedLora({
        url: result.model_url,
        trigger: result.trigger_word,
      });

      toast.success("🎉 LoRA entrenado exitosamente");
    } catch (error) {
      toast.error("Error al entrenar LoRA");
    } finally {
      setIsTrainingLoRA(false);
    }
  };

  // Guardar personaje
  const saveCharacter = async () => {
    try {
      const selectedImages = generatedImages.filter((img) => img.selected);

      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...character,
          reference_images: selectedImages.map((img) => img.url),
          thumbnail_url: selectedImages[0]?.url,
          lora_model_url: trainedLora?.url,
          visual_prompt_base: generatedPrompt,
          voice_id: selectedVoice?.id,
          voice_name: selectedVoice?.name,
          is_active: true,
          is_baytt_character: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to save character");

      const saved = await response.json();
      toast.success("✅ Personaje guardado");
      router.push(`/admin/characters/${saved.id}`);
    } catch (error) {
      toast.error("Error al guardar personaje");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Sparkles className="h-8 w-8" />
            Generador de Personajes Hiperrealistas
          </h1>
          <p className="text-foreground-muted mt-2">
            Crea personajes fotorrealistas con IA, indistinguibles de humanos
            reales
          </p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          Flux 1.1 Pro Ultra + LoRA
        </Badge>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4 overflow-x-auto">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-shrink-0">
              <button
                onClick={() => setCurrentStep(index)}
                className={`flex flex-col items-center gap-2 transition-all ${
                  index === currentStep
                    ? "text-primary scale-110"
                    : index < currentStep
                    ? "text-success"
                    : "text-foreground-muted"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    index === currentStep
                      ? "border-primary bg-primary/20"
                      : index < currentStep
                      ? "border-success bg-success/20"
                      : "border-border bg-background-secondary"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <StepIcon className="h-6 w-6" />
                  )}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                  {step.title}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    index < currentStep ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Principal */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* PASO 0: Básico */}
              {currentStep === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Información Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <InputWrapper
                        label="Nombre del Personaje"
                        value={character.name}
                        onChange={(e) =>
                          setCharacter({ ...character, name: e.target.value })
                        }
                        placeholder="Ej: Detective Marcos"
                      />
                      <SelectWrapper
                        label="Categoría"
                        value={character.category}
                        onChange={(v) =>
                          setCharacter({ ...character, category: v })
                        }
                        options={CHARACTER_CATEGORIES.map((c) => ({
                          value: c.id,
                          label: `${c.name}`,
                        }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <SelectWrapper
                        label="Género"
                        value={character.gender}
                        onChange={(v) =>
                          setCharacter({ ...character, gender: v })
                        }
                        options={GENDERS.map((g) => ({
                          value: g.id,
                          label: `${g.icon} ${g.label}`,
                        }))}
                      />
                      <SelectWrapper
                        label="Etnia"
                        value={character.physical.ethnicity || ""}
                        onChange={(v) => updatePhysical("ethnicity", v)}
                        options={ETHNICITIES.map((e) => ({
                          value: e.id,
                          label: e.label,
                        }))}
                      />
                    </div>
                    <TextareaWrapper
                      label="Descripción General"
                      value={character.description}
                      onChange={(e) =>
                        setCharacter({
                          ...character,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe brevemente al personaje..."
                      rows={3}
                    />
                    <Button
                      onClick={generateRandomTraits}
                      disabled={
                        isGeneratingTraits ||
                        !character.category ||
                        !character.gender
                      }
                      variant="secondary"
                      className="w-full"
                    >
                      {isGeneratingTraits ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Generando...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" /> Generar
                          Características con IA
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* PASO 1: Físico */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Características Físicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <InputWrapper
                        label="Edad Exacta"
                        type="number"
                        value={character.physical.exact_age.toString()}
                        onChange={(e) =>
                          updatePhysical(
                            "exact_age",
                            parseInt(e.target.value) || 30
                          )
                        }
                        min={5}
                        max={90}
                      />
                      <InputWrapper
                        label="Altura (cm)"
                        type="number"
                        value={character.physical.height_cm?.toString() || ""}
                        onChange={(e) =>
                          updatePhysical(
                            "height_cm",
                            parseInt(e.target.value) || undefined
                          )
                        }
                        min={100}
                        max={220}
                      />
                      <InputWrapper
                        label="Peso (kg)"
                        type="number"
                        value={character.physical.weight_kg?.toString() || ""}
                        onChange={(e) =>
                          updatePhysical(
                            "weight_kg",
                            parseInt(e.target.value) || undefined
                          )
                        }
                        min={30}
                        max={150}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <SelectWrapper
                        label="Tipo de Cuerpo"
                        value={character.physical.body_type || ""}
                        onChange={(v) => updatePhysical("body_type", v)}
                        options={BODY_TYPES}
                      />
                      <InputWrapper
                        label="Complexión (descripción)"
                        value={character.physical.build || ""}
                        onChange={(e) => updatePhysical("build", e.target.value)}
                        placeholder="Ej: Atlético con hombros anchos"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputWrapper
                        label="Tono de Piel"
                        value={character.physical.skin_tone || ""}
                        onChange={(e) =>
                          updatePhysical("skin_tone", e.target.value)
                        }
                        placeholder="Ej: Piel morena clara, tono cálido"
                      />
                      <InputWrapper
                        label="Postura"
                        value={character.physical.posture || ""}
                        onChange={(e) =>
                          updatePhysical("posture", e.target.value)
                        }
                        placeholder="Ej: Erguida y confiada"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PASO 2: Rostro */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rasgos Faciales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectWrapper
                        label="Forma de Rostro"
                        value={character.physical.face_shape || ""}
                        onChange={(v) => updatePhysical("face_shape", v)}
                        options={FACE_SHAPES}
                      />
                      <SelectWrapper
                        label="Forma de Ojos"
                        value={character.physical.eye_shape || ""}
                        onChange={(v) => updatePhysical("eye_shape", v)}
                        options={EYE_SHAPES}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputWrapper
                        label="Color de Ojos"
                        value={character.physical.eye_color || ""}
                        onChange={(e) =>
                          updatePhysical("eye_color", e.target.value)
                        }
                        placeholder="Ej: Marrón oscuro con destellos dorados"
                      />
                      <InputWrapper
                        label="Cejas"
                        value={character.physical.eyebrows || ""}
                        onChange={(e) =>
                          updatePhysical("eyebrows", e.target.value)
                        }
                        placeholder="Ej: Gruesas y definidas"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <InputWrapper
                        label="Color de Cabello"
                        value={character.physical.hair_color || ""}
                        onChange={(e) =>
                          updatePhysical("hair_color", e.target.value)
                        }
                        placeholder="Ej: Castaño oscuro"
                      />
                      <SelectWrapper
                        label="Largo de Cabello"
                        value={character.physical.hair_length || ""}
                        onChange={(v) => updatePhysical("hair_length", v)}
                        options={HAIR_LENGTHS}
                      />
                      <InputWrapper
                        label="Estilo de Cabello"
                        value={character.physical.hair_style || ""}
                        onChange={(e) =>
                          updatePhysical("hair_style", e.target.value)
                        }
                        placeholder="Ej: Peinado hacia atrás"
                      />
                    </div>
                    <InputWrapper
                      label="Textura de Cabello"
                      value={character.physical.hair_texture || ""}
                      onChange={(e) =>
                        updatePhysical("hair_texture", e.target.value)
                      }
                      placeholder="Ej: Ondulado, grueso"
                    />
                    {character.gender !== "female" && (
                      <InputWrapper
                        label="Vello Facial"
                        value={character.physical.facial_hair || ""}
                        onChange={(e) =>
                          updatePhysical("facial_hair", e.target.value)
                        }
                        placeholder="Ej: Barba de 3 días, recortada"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <InputWrapper
                        label="Nariz"
                        value={character.physical.nose_shape || ""}
                        onChange={(e) =>
                          updatePhysical("nose_shape", e.target.value)
                        }
                        placeholder="Ej: Recta, tamaño mediano"
                      />
                      <InputWrapper
                        label="Labios"
                        value={character.physical.lips || ""}
                        onChange={(e) => updatePhysical("lips", e.target.value)}
                        placeholder="Ej: Medianos, bien definidos"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputWrapper
                        label="Mandíbula"
                        value={character.physical.jawline || ""}
                        onChange={(e) =>
                          updatePhysical("jawline", e.target.value)
                        }
                        placeholder="Ej: Marcada y angular"
                      />
                      <InputWrapper
                        label="Pómulos"
                        value={character.physical.cheekbones || ""}
                        onChange={(e) =>
                          updatePhysical("cheekbones", e.target.value)
                        }
                        placeholder="Ej: Altos y pronunciados"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PASO 3: Estilo y Personalidad */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Vestuario y Personalidad</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <TextareaWrapper
                      label="Vestuario por Defecto"
                      value={character.wardrobe.default_outfit || ""}
                      onChange={(e) =>
                        setCharacter({
                          ...character,
                          wardrobe: {
                            ...character.wardrobe,
                            default_outfit: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej: Cazadora de cuero negra, camiseta gris, jeans oscuros, botas negras"
                      rows={2}
                    />
                    <TextareaWrapper
                      label="Rasgos Distintivos (separados por coma)"
                      value={character.physical.distinctive_marks?.join(", ") || ""}
                      onChange={(e) =>
                        updatePhysical(
                          "distinctive_marks",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Ej: Cicatriz en ceja izquierda, lunar en mejilla derecha"
                      rows={2}
                    />
                    <InputWrapper
                      label="Tatuajes (separados por coma)"
                      value={character.physical.tattoos?.join(", ") || ""}
                      onChange={(e) =>
                        updatePhysical(
                          "tattoos",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Ej: Tatuaje tribal en brazo derecho"
                    />
                    <InputWrapper
                      label="Cicatrices (separadas por coma)"
                      value={character.physical.scars?.join(", ") || ""}
                      onChange={(e) =>
                        updatePhysical(
                          "scars",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Ej: Cicatriz pequeña en mentón"
                    />
                  </CardContent>
                </Card>
              )}

              {/* PASO 4: Generar Imágenes */}
              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generar Imágenes con Flux 1.1 Pro Ultra</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Prompt Preview */}
                    {generatedPrompt && (
                      <div className="p-4 bg-background-secondary rounded-lg">
                        <p className="text-sm text-foreground-muted font-mono">
                          {generatedPrompt.substring(0, 300)}...
                        </p>
                      </div>
                    )}

                    {/* Botón Generar */}
                    <Button
                      onClick={generateImages}
                      disabled={isGeneratingImages}
                      className="w-full"
                      size="lg"
                    >
                      {isGeneratingImages ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                          Generando 8 imágenes...
                        </>
                      ) : (
                        <>
                          <ImagePlus className="mr-2 h-5 w-5" /> Generar
                          Imágenes Fotorrealistas
                        </>
                      )}
                    </Button>

                    {/* Grid de Imágenes */}
                    {generatedImages.length > 0 && (
                      <>
                        <p className="text-sm text-foreground-muted">
                          Selecciona al menos 8 imágenes para entrenar el LoRA:
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                          {generatedImages.map((img, index) => (
                            <div
                              key={index}
                              onClick={() => toggleImageSelection(index)}
                              className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                                img.selected
                                  ? "ring-4 ring-primary scale-95"
                                  : "hover:scale-105"
                              }`}
                            >
                              <img
                                src={img.url}
                                alt={`Variación ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {img.selected && (
                                <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                  <Check className="h-10 w-10 text-white" />
                                </div>
                              )}
                              <div className="absolute bottom-1 left-1 bg-black/70 px-2 py-0.5 rounded text-xs">
                                {img.pose}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-primary">
                          {generatedImages.filter((i) => i.selected).length} de 8
                          mínimo seleccionadas
                        </p>
                      </>
                    )}

                    {/* Entrenar LoRA */}
                    {generatedImages.filter((i) => i.selected).length >= 8 &&
                      !trainedLora && (
                        <div className="border-t border-border pt-6">
                          <h3 className="font-semibold mb-4">
                            Entrenar Modelo LoRA
                          </h3>
                          <p className="text-sm text-foreground-muted mb-4">
                            El LoRA garantiza que el personaje se vea EXACTAMENTE
                            igual en todas las escenas y películas.
                          </p>
                          {isTrainingLoRA ? (
                            <div className="space-y-3">
                              <Progress value={loraProgress} className="h-3" />
                              <p className="text-sm text-center text-foreground-muted">
                                Entrenando LoRA... {loraProgress}% (esto puede
                                tomar 10-20 minutos)
                              </p>
                            </div>
                          ) : (
                            <Button
                              onClick={trainLoRA}
                              variant="default"
                              className="w-full"
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Entrenar LoRA (~$2.50)
                            </Button>
                          )}
                        </div>
                      )}

                    {/* LoRA Entrenado */}
                    {trainedLora && (
                      <div className="p-4 bg-success/20 border border-success rounded-lg">
                        <div className="flex items-center gap-3">
                          <Check className="h-6 w-6 text-success" />
                          <div>
                            <p className="font-semibold text-success">
                              LoRA Entrenado Exitosamente
                            </p>
                            <p className="text-sm text-foreground-muted">
                              Trigger word:{" "}
                              <code className="bg-background px-2 py-0.5 rounded">
                                {trainedLora.trigger}
                              </code>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* PASO 5: Voz */}
              {currentStep === 5 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Asignar Voz</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VoiceSelector
                      gender={character.gender}
                      onSelect={setSelectedVoice}
                      selected={selectedVoice}
                    />
                  </CardContent>
                </Card>
              )}

              {/* PASO 6: Revisión Final */}
              {currentStep === 6 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Revisión Final</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Resumen del personaje */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2">Información</h3>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-foreground-muted">Nombre:</dt>
                            <dd>{character.name}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-foreground-muted">Categoría:</dt>
                            <dd>{character.category}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-foreground-muted">Edad:</dt>
                            <dd>{character.physical.exact_age} años</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-foreground-muted">Altura:</dt>
                            <dd>{character.physical.height_cm} cm</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Estado</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {generatedImages.filter((i) => i.selected).length >=
                            8 ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <X className="h-4 w-4 text-error" />
                            )}
                            <span className="text-sm">
                              Imágenes seleccionadas
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {trainedLora ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <X className="h-4 w-4 text-error" />
                            )}
                            <span className="text-sm">LoRA entrenado</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedVoice ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <X className="h-4 w-4 text-error" />
                            )}
                            <span className="text-sm">Voz asignada</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Imágenes seleccionadas */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Imágenes de Referencia
                      </h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {generatedImages
                          .filter((i) => i.selected)
                          .map((img, i) => (
                            <img
                              key={i}
                              src={img.url}
                              alt=""
                              className="h-24 w-24 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={saveCharacter}
                      className="w-full"
                      size="lg"
                      disabled={!trainedLora || !selectedVoice}
                    >
                      <Save className="mr-2 h-5 w-5" />
                      Guardar Personaje
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navegación */}
          <div className="flex justify-between mt-6">
            <Button
              onClick={() =>
                setCurrentStep((prev) => Math.max(0, prev - 1))
              }
              disabled={currentStep === 0}
              variant="secondary"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button
              onClick={() =>
                setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))
              }
              disabled={currentStep === steps.length - 1}
            >
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Panel Lateral - Preview */}
        <div className="space-y-6">
          {/* Preview del Personaje */}
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedImages.filter((i) => i.selected)[0] ? (
                <img
                  src={generatedImages.filter((i) => i.selected)[0].url}
                  alt={character.name}
                  className="w-full aspect-square object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full aspect-square bg-background-secondary rounded-lg flex items-center justify-center mb-4">
                  <User className="h-20 w-20 text-foreground-subtle" />
                </div>
              )}
              <h3 className="text-xl font-bold">
                {character.name || "Sin nombre"}
              </h3>
              <p className="text-foreground-muted text-sm mt-1">
                {character.physical.exact_age} años •{" "}
                {character.physical.height_cm}cm •{" "}
                {character.physical.body_type}
              </p>
              {character.category && (
                <Badge className="mt-3">{character.category}</Badge>
              )}
              {trainedLora && (
                <Badge variant="default" className="mt-2 ml-2">
                  LoRA ✓
                </Badge>
              )}
              {selectedVoice && (
                <Badge variant="default" className="mt-2 ml-2">
                  Voz ✓
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

