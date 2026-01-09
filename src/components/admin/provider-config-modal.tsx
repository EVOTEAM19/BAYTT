"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Save,
  TestTube,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { TextareaWrapper } from "@/components/ui/textarea-wrapper";
import { SelectWrapper } from "@/components/ui/select-wrapper";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import type { ProviderType } from "@/types/provider";
import { PROVIDER_VERSIONS } from "@/types/provider";

// Schema de validación
const providerSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos"),
  type: z.enum([
    "video",
    "audio",
    "music",
    "llm",
    "storage",
    "image",
    "lora_training",
  ]),
  api_url: z.string().url("URL inválida").or(z.literal("")),
  api_key: z.string().optional(),
  api_version: z.string().optional(), // ⭐ Versión de API
  auth_method: z.enum(["bearer", "api_key", "basic", "custom", "none"]),
  auth_header: z.string().optional(),
  description: z.string().optional(),
  config: z.string().optional(), // JSON string
  cost_per_second: z.number().min(0).optional().or(z.nan()),
  cost_per_request: z.number().min(0).optional().or(z.nan()),
  max_duration_seconds: z.number().min(0).optional().or(z.nan()),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  priority: z.number().min(0).default(0).or(z.nan()),
});

type ProviderFormData = z.infer<typeof providerSchema>;

// Presets de proveedores conocidos
const PROVIDER_PRESETS: Record<string, Partial<ProviderFormData>> = {
  // ==========================================
  // VIDEO PROVIDERS
  // ==========================================
  runway: {
    name: 'Runway Gen-3 Alpha Turbo',
    slug: 'runway',
    type: 'video',
    api_url: 'https://api.dev.runwayml.com/v1/generate',
    api_version: '2024-11-06', // ⭐ Versión por defecto más reciente
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0.05,
    cost_per_request: 0,
    max_duration_seconds: 10,
    priority: 0,
    description: 'Mejor coherencia temporal, movimientos naturales, calidad cinematográfica',
    config: JSON.stringify({
      model: 'gen3a_turbo',
      ratio: '1280:720', // Runway format: 1280:720 (16:9 horizontal) - DOS PUNTOS
      duration: 10,
      seed: null,
      watermark: false
    }, null, 2)
  },
  kling: {
    name: 'Kling AI 1.6',
    slug: 'kling',
    type: 'video',
    api_url: 'https://api.klingai.com/v1/videos/generate',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0.08,
    cost_per_request: 0,
    max_duration_seconds: 10,
    priority: 1,
    description: 'Excelente movimiento, buena relación calidad/precio',
    config: JSON.stringify({
      model: 'kling-v1.6',
      mode: 'standard',
      duration: 5,
      aspect_ratio: '16:9'
    }, null, 2)
  },
  luma: {
    name: 'Luma Dream Machine',
    slug: 'luma',
    type: 'video',
    api_url: 'https://api.lumalabs.ai/dream-machine/v1/generations',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0.033,
    cost_per_request: 0,
    max_duration_seconds: 5,
    priority: 2,
    description: 'Más económico, bueno para escenas simples',
    config: JSON.stringify({
      aspect_ratio: '16:9',
      loop: false
    }, null, 2)
  },
  
  // ==========================================
  // AUDIO/VOZ PROVIDERS
  // ==========================================
  elevenlabs: {
    name: 'ElevenLabs',
    slug: 'elevenlabs',
    type: 'audio',
    api_url: 'https://api.elevenlabs.io/v1/text-to-speech',
    auth_method: 'api_key',
    auth_header: 'xi-api-key',
    cost_per_second: 0,
    cost_per_request: 0.0003, // por caracter
    max_duration_seconds: 0,
    priority: 0,
    description: 'Voces más naturales del mercado, mejor clonación, emociones realistas',
    config: JSON.stringify({
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      },
      output_format: 'mp3_44100_128'
    }, null, 2)
  },
  playht: {
    name: 'PlayHT 3.0',
    slug: 'playht',
    type: 'audio',
    api_url: 'https://api.play.ht/api/v2/tts',
    auth_method: 'api_key',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.0002,
    max_duration_seconds: 0,
    priority: 1,
    description: 'Buena alternativa, voces expresivas',
    config: JSON.stringify({
      voice_engine: 'PlayHT2.0',
      output_format: 'mp3',
      sample_rate: 44100,
      speed: 1
    }, null, 2)
  },
  openai_tts: {
    name: 'OpenAI TTS',
    slug: 'openai_tts',
    type: 'audio',
    api_url: 'https://api.openai.com/v1/audio/speech',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.000015, // por caracter
    max_duration_seconds: 0,
    priority: 2,
    description: 'Económico, integración fácil con ecosistema OpenAI',
    config: JSON.stringify({
      model: 'tts-1-hd',
      voice: 'alloy', // alloy, echo, fable, onyx, nova, shimmer
      response_format: 'mp3',
      speed: 1.0
    }, null, 2)
  },
  
  // ==========================================
  // MÚSICA PROVIDERS
  // ==========================================
  suno: {
    name: 'Suno v4',
    slug: 'suno',
    type: 'music',
    api_url: 'https://api.suno.ai/v1/generate',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.05,
    max_duration_seconds: 240, // 4 minutos max
    priority: 0,
    description: 'Composiciones más coherentes, mejor calidad de audio, géneros variados',
    config: JSON.stringify({
      make_instrumental: false,
      wait_audio: true,
      duration: 120
    }, null, 2)
  },
  udio: {
    name: 'Udio',
    slug: 'udio',
    type: 'music',
    api_url: 'https://api.udio.com/v1/generate',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.04,
    max_duration_seconds: 180,
    priority: 1,
    description: 'Buena alternativa, mejor en algunos géneros específicos',
    config: JSON.stringify({
      prompt_strength: 0.5,
      duration_seconds: 120
    }, null, 2)
  },
  
  // ==========================================
  // LLM PROVIDERS (Guiones) - GPT RECOMENDADO
  // ==========================================
  openai: {
    name: 'OpenAI GPT-4 Turbo',
    slug: 'openai',
    type: 'llm',
    api_url: 'https://api.openai.com/v1/chat/completions',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.01, // por 1K tokens input
    max_duration_seconds: 0,
    priority: 0, // ← PRIORIDAD 0 = RECOMENDADO
    description: '🏆 RECOMENDADO: Muy versátil, excelente para guiones, bien documentado',
    config: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      temperature: 0.8,
      max_tokens: 4096,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    }, null, 2)
  },
  claude: {
    name: 'Claude 3.5 Sonnet',
    slug: 'claude',
    type: 'llm',
    api_url: 'https://api.anthropic.com/v1/messages',
    auth_method: 'api_key',
    auth_header: 'x-api-key',
    cost_per_second: 0,
    cost_per_request: 0.003,
    max_duration_seconds: 0,
    priority: 1,
    description: 'Excelente creatividad y contexto largo (200K tokens)',
    config: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.8
    }, null, 2)
  },
  gemini: {
    name: 'Google Gemini 1.5 Pro',
    slug: 'gemini',
    type: 'llm',
    api_url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    auth_method: 'api_key',
    auth_header: 'x-goog-api-key',
    cost_per_second: 0,
    cost_per_request: 0.0025,
    max_duration_seconds: 0,
    priority: 2,
    description: 'Contexto muy largo (1M tokens), buena relación calidad/precio',
    config: JSON.stringify({
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
        topP: 0.95
      }
    }, null, 2)
  },
  
  // ==========================================
  // STORAGE PROVIDERS
  // ==========================================
  r2: {
    name: 'Cloudflare R2',
    slug: 'r2',
    type: 'storage',
    api_url: 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
    auth_method: 'custom',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0,
    max_duration_seconds: 0,
    priority: 0,
    description: '80% más barato que S3, sin costes de salida (egress), CDN global incluido',
    config: JSON.stringify({
      bucket: 'baytt-media',
      region: 'auto',
      public_url: 'https://media.baytt.com',
      // Necesita: ACCESS_KEY_ID y SECRET_ACCESS_KEY
    }, null, 2)
  },
  s3: {
    name: 'AWS S3',
    slug: 's3',
    type: 'storage',
    api_url: 'https://s3.<REGION>.amazonaws.com',
    auth_method: 'custom',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0,
    max_duration_seconds: 0,
    priority: 1,
    description: 'Estándar de la industria, más servicios integrados',
    config: JSON.stringify({
      bucket: 'baytt-media',
      region: 'eu-west-1',
      acl: 'public-read',
      // Necesita: AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY
    }, null, 2)
  },
  supabase_storage: {
    name: 'Supabase Storage',
    slug: 'supabase_storage',
    type: 'storage',
    api_url: (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jpyklacagfvvswsrohiz.supabase.co') + '/storage/v1',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0,
    max_duration_seconds: 0,
    priority: 2,
    description: 'Ya integrado con tu proyecto, fácil de usar',
    config: JSON.stringify({
      bucket: 'media',
      public: true
    }, null, 2)
  },
  
  // ==========================================
  // IMAGE PROVIDERS
  // ==========================================
  flux_ultra: {
    name: 'Flux 1.1 Pro Ultra',
    slug: 'flux_ultra',
    type: 'image',
    api_url: 'https://api.bfl.ml/v1/flux-pro-1.1-ultra',
    auth_method: 'api_key',
    auth_header: 'X-Key',
    cost_per_second: 0,
    cost_per_request: 0.06,
    max_duration_seconds: 0,
    priority: 0,
    description: '🏆 RECOMENDADO: Máximo fotorrealismo en rostros humanos, indistinguible de fotos reales',
    config: JSON.stringify({
      width: 1024,
      height: 1024,
      steps: 50,
      guidance: 3.5,
      safety_tolerance: 2,
      output_format: 'png',
      raw: false
    }, null, 2)
  },
  flux_replicate: {
    name: 'Flux 1.1 Pro (Replicate)',
    slug: 'flux_replicate',
    type: 'image',
    api_url: 'https://api.replicate.com/v1/predictions',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.05,
    max_duration_seconds: 0,
    priority: 1,
    description: 'Flux via Replicate, fácil integración',
    config: JSON.stringify({
      model: 'black-forest-labs/flux-1.1-pro',
      input: {
        width: 1024,
        height: 1024,
        num_outputs: 1,
        guidance_scale: 3.5,
        num_inference_steps: 50,
        output_format: 'png'
      }
    }, null, 2)
  },
  midjourney: {
    name: 'Midjourney',
    slug: 'midjourney',
    type: 'image',
    api_url: 'https://api.midjourney.com/v1/imagine',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.08,
    max_duration_seconds: 0,
    priority: 2,
    description: 'Excelente calidad artística, muy estilizado',
    config: JSON.stringify({
      version: '6.1',
      quality: 1,
      stylize: 100,
      aspect_ratio: '1:1'
    }, null, 2)
  },
  dalle3: {
    name: 'DALL-E 3',
    slug: 'dalle3',
    type: 'image',
    api_url: 'https://api.openai.com/v1/images/generations',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 0.04,
    max_duration_seconds: 0,
    priority: 3,
    description: 'Buena integración con ecosistema OpenAI, fácil de usar',
    config: JSON.stringify({
      model: 'dall-e-3',
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
      response_format: 'url'
    }, null, 2)
  },
  
  // ==========================================
  // LoRA TRAINING PROVIDERS
  // ==========================================
  replicate_lora: {
    name: 'Replicate LoRA Trainer',
    slug: 'replicate_lora',
    type: 'lora_training',
    api_url: 'https://api.replicate.com/v1/trainings',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 2.50,
    max_duration_seconds: 1800, // 30 min max
    priority: 0,
    description: '🏆 RECOMENDADO: Mejor calidad de modelo resultante, estable, bien documentado',
    config: JSON.stringify({
      model: 'ostris/flux-dev-lora-trainer',
      destination: 'baytt/characters',
      input: {
        steps: 1000,
        learning_rate: 0.0001,
        batch_size: 1,
        resolution: '1024',
        autocaption: true,
        autocaption_prefix: 'a photo of TOK,',
        lora_rank: 16
      }
    }, null, 2)
  },
  fal_lora: {
    name: 'Fal.ai LoRA',
    slug: 'fal_lora',
    type: 'lora_training',
    api_url: 'https://fal.run/fal-ai/flux-lora-fast-training',
    auth_method: 'api_key',
    auth_header: 'Authorization',
    cost_per_second: 0,
    cost_per_request: 2.00,
    max_duration_seconds: 900, // 15 min
    priority: 1,
    description: 'Más rápido (~8 min), más económico',
    config: JSON.stringify({
      steps: 1000,
      create_masks: true,
      is_style: false,
      trigger_word: 'TOK'
    }, null, 2)
  }
};

// Links para obtener API keys
const API_KEY_LINKS: Record<string, string> = {
  runway: "https://app.runwayml.com/settings/api-keys",
  kling: "https://klingai.com/developer",
  luma: "https://lumalabs.ai/dream-machine/api",
  elevenlabs: "https://elevenlabs.io/app/settings/api-keys",
  playht: "https://play.ht/studio/api-access",
  openai_tts: "https://platform.openai.com/api-keys",
  openai: "https://platform.openai.com/api-keys",
  gemini: "https://aistudio.google.com/app/apikey",
  suno: "https://suno.ai/account",
  udio: "https://udio.com/settings/api",
  claude: "https://console.anthropic.com/settings/keys",
  r2: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
  s3: "https://console.aws.amazon.com/iam/home#/security_credentials",
  supabase_storage: "https://supabase.com/dashboard/project/_/settings/api",
  flux_ultra: "https://api.bfl.ml",
  flux_replicate: "https://replicate.com/account/api-tokens",
  midjourney: "https://www.midjourney.com/account",
  dalle3: "https://platform.openai.com/api-keys",
  replicate_lora: "https://replicate.com/account/api-tokens",
  fal_lora: "https://fal.ai/dashboard/keys",
};

interface ProviderConfigModalProps {
  open: boolean;
  onClose: () => void;
  // Para editar un proveedor existente
  existingProvider?: any;
  // Para precargar con un preset específico
  presetSlug?: string;
  // Tipo de proveedor (si viene de una pestaña específica)
  defaultType?: string;
  // Callback al guardar
  onSaved?: () => void;
}

export function ProviderConfigModal({
  open,
  onClose,
  existingProvider,
  presetSlug,
  defaultType,
  onSaved,
}: ProviderConfigModalProps) {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const isEditing = !!existingProvider;

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: "",
      slug: "",
      type: (defaultType as ProviderType) || "video",
      api_url: "",
      api_key: "",
      api_version: "", // ⭐ Versión de API
      auth_method: "bearer",
      auth_header: "",
      description: "",
      config: "{}",
      cost_per_second: 0,
      cost_per_request: 0,
      max_duration_seconds: 0,
      is_active: true,
      is_default: false,
      priority: 0,
    },
  });

  // Cargar preset o proveedor existente
  useEffect(() => {
    if (existingProvider) {
      form.reset({
        ...existingProvider,
        api_key: "", // No mostramos la key existente por seguridad
        api_version: existingProvider.api_version || existingProvider.config?.api_version || "", // ⭐ Cargar versión
        config: JSON.stringify(existingProvider.config || {}, null, 2),
      });
    } else if (presetSlug && PROVIDER_PRESETS[presetSlug]) {
      const preset = PROVIDER_PRESETS[presetSlug];
      // Obtener versión por defecto del preset o de PROVIDER_VERSIONS
      const defaultVersion = preset.api_version || (PROVIDER_VERSIONS[presetSlug]?.default || "");
      form.reset({
        ...form.getValues(),
        ...preset,
        api_version: defaultVersion, // ⭐ Usar versión del preset o default
        config: JSON.stringify(preset.config || {}, null, 2),
      });
    }
  }, [existingProvider, presetSlug]);

  // Generar slug automáticamente desde el nombre
  const watchName = form.watch("name");
  useEffect(() => {
    if (!isEditing && !presetSlug && watchName) {
      const slug = watchName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/(^_|_$)/g, "");
      form.setValue("slug", slug);
    }
  }, [watchName, isEditing, presetSlug]);

  // Test de conexión
  const testConnection = async () => {
    const values = form.getValues();

    if (
      !values.api_url ||
      (!values.api_key && values.auth_method !== "none")
    ) {
      toast({
        title: "Datos incompletos",
        description: "Introduce la URL y API Key para probar",
        variant: "error",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(API_ENDPOINTS.providers.test(""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: values.type,
          api_url: values.api_url,
          api_key: values.api_key,
          auth_method: values.auth_method,
          auth_header: values.auth_header,
          config: values.config ? JSON.parse(values.config) : {},
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult("success");
        toast({
          title: "✅ Conexión exitosa",
          description: result.message || "El proveedor responde correctamente",
          variant: "success",
        });
      } else {
        setTestResult("error");
        toast({
          title: "❌ Error de conexión",
          description: result.error || "No se pudo conectar con el proveedor",
          variant: "error",
        });
      }
    } catch (err: any) {
      setTestResult("error");
      toast({
        title: "Error",
        description: err.message,
        variant: "error",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Guardar proveedor
  const onSubmit = async (data: ProviderFormData) => {
    setIsSaving(true);

    try {
      const endpoint = isEditing
        ? API_ENDPOINTS.providers.update(existingProvider.id)
        : API_ENDPOINTS.providers.create;

      const method = isEditing ? "PUT" : "POST";

      // Parsear config JSON
      let configData: Record<string, any> = {};
      try {
        configData = data.config && data.config.trim() !== "" ? JSON.parse(data.config) : {};
      } catch (e) {
        console.error("Error parseando config JSON:", e);
        configData = {};
      }

      // Si hay auth_header y el método es custom, agregarlo a config
      if (data.auth_method === "custom" && data.auth_header) {
        configData.auth_header = data.auth_header;
      }

      // Si hay max_duration_seconds y es tipo video, agregarlo a config
      if (data.type === "video" && data.max_duration_seconds && !isNaN(data.max_duration_seconds)) {
        configData.max_duration_seconds = data.max_duration_seconds;
      }

      // Asegurar que para LLM siempre haya un modelo en el config
      if (data.type === "llm" && !configData.model) {
        // Intentar obtener el modelo del slug o usar uno por defecto
        const slug = data.slug?.toLowerCase() || "";
        if (slug.includes("openai")) {
          configData.model = "gpt-4-turbo-preview";
        } else if (slug.includes("claude")) {
          configData.model = "claude-3-5-sonnet-20241022";
        } else if (slug.includes("gemini")) {
          configData.model = "gemini-1.5-pro";
        } else {
          configData.model = "gpt-4-turbo-preview"; // Modelo por defecto
        }
      }

      // Preparar payload según el schema del backend
      const payload: any = {
        type: data.type,
        name: data.name.trim(),
        slug: data.slug.trim(),
        auth_method: data.auth_method,
        is_active: data.is_active ?? true,
        is_default: data.is_default ?? false,
      };

      // priority: siempre enviar, mínimo 0
      const priority = typeof data.priority === "number" && !isNaN(data.priority) && data.priority >= 0 
        ? data.priority 
        : 0;
      payload.priority = priority;

      // api_url: siempre incluir, puede ser URL válida o string vacío
      payload.api_url = (data.api_url && data.api_url.trim() !== "") ? data.api_url.trim() : "";

      // config: incluir solo si tiene valores, sino null
      payload.config = Object.keys(configData).length > 0 ? configData : null;

      // cost_per_second: solo incluir si es válido
      if (typeof data.cost_per_second === "number" && !isNaN(data.cost_per_second) && data.cost_per_second >= 0) {
        payload.cost_per_second = data.cost_per_second;
      } else if (data.cost_per_second === null || data.cost_per_second === "") {
        payload.cost_per_second = null;
      }

      // cost_per_request: solo incluir si es válido
      if (typeof data.cost_per_request === "number" && !isNaN(data.cost_per_request) && data.cost_per_request >= 0) {
        payload.cost_per_request = data.cost_per_request;
      } else if (data.cost_per_request === null || data.cost_per_request === "") {
        payload.cost_per_request = null;
      }

      // Si hay api_key, enviarlo para que el backend lo encripte
      if (data.api_key && data.api_key.trim() !== "") {
        payload.api_key = data.api_key;
      }

      // ⭐ Incluir api_version si está definida
      if (data.api_version && data.api_version.trim() !== "") {
        payload.api_version = data.api_version.trim();
      }

      console.log("Enviando payload:", payload);

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error del servidor completo:", JSON.stringify(error, null, 2));
        let errorMessage = error.error || error.message || "Error al guardar";
        
        // Si hay detalles de validación, agregarlos al mensaje
        if (error.details && Array.isArray(error.details)) {
          const validationErrors = error.details
            .map((err: any) => {
              const field = err.path && err.path.length > 0 ? err.path.join(".") : "campo desconocido";
              return `${field}: ${err.message}`;
            })
            .join("\n");
          errorMessage = `${errorMessage}\n\nDetalles:\n${validationErrors}`;
        } else if (error.details) {
          // Si details no es un array, mostrarlo de todas formas
          errorMessage = `${errorMessage}\n\nDetalles: ${JSON.stringify(error.details)}`;
        }
        
        throw new Error(errorMessage);
      }

      toast({
        title: isEditing ? "✅ Proveedor actualizado" : "✅ Proveedor creado",
        description: `${data.name} configurado correctamente`,
        variant: "success",
      });

      onSaved?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Error al guardar",
        description: err.message || "Error desconocido",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar proveedor
  const deleteProvider = async () => {
    if (!existingProvider) return;

    if (
      !confirm(`¿Estás seguro de eliminar ${existingProvider.name}?`)
    )
      return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        API_ENDPOINTS.providers.delete(existingProvider.id),
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar");
      }

      toast({
        title: "Proveedor eliminado",
        variant: "success",
      });

      onSaved?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Error al eliminar",
        description: err.message,
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const currentSlug = form.watch("slug");
  const apiKeyLink =
    API_KEY_LINKS[currentSlug] || API_KEY_LINKS[presetSlug || ""];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Editar: ${existingProvider.name}`
              : presetSlug
              ? `Configurar: ${PROVIDER_PRESETS[presetSlug]?.name}`
              : "Añadir Proveedor Personalizado"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica la configuración del proveedor"
              : "Configura los datos de conexión del proveedor de IA"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="auth">Autenticación</TabsTrigger>
              <TabsTrigger value="advanced">Avanzado</TabsTrigger>
            </TabsList>

            {/* TAB: Básico */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputWrapper
                  label="Nombre del Proveedor"
                  placeholder="Ej: Mi Proveedor Custom"
                  {...form.register("name")}
                  error={form.formState.errors.name?.message}
                />
                <InputWrapper
                  label="Slug (identificador único)"
                  placeholder="mi_proveedor_custom"
                  {...form.register("slug")}
                  error={form.formState.errors.slug?.message}
                  disabled={isEditing}
                />
              </div>

              <SelectWrapper
                label="Tipo de Proveedor"
                value={form.watch("type")}
                onChange={(v) => form.setValue("type", v as ProviderType)}
                options={[
                  { value: "video", label: "📹 Video" },
                  { value: "audio", label: "🎙️ Voz/Audio" },
                  { value: "music", label: "🎵 Música" },
                  { value: "llm", label: "📝 LLM (Guiones)" },
                  { value: "storage", label: "💾 Almacenamiento" },
                  { value: "image", label: "🖼️ Imagen" },
                  { value: "lora_training", label: "🎭 Entrenamiento LoRA" },
                ]}
                disabled={!!presetSlug || isEditing}
              />

              <InputWrapper
                label="URL de la API"
                placeholder="https://api.ejemplo.com/v1"
                {...form.register("api_url")}
                error={form.formState.errors.api_url?.message}
              />

              {/* Selector de versión de API */}
              {(() => {
                const currentSlug = form.watch("slug");
                const providerVersions = currentSlug && PROVIDER_VERSIONS[currentSlug] 
                  ? PROVIDER_VERSIONS[currentSlug]
                  : null;
                
                if (providerVersions) {
                  return (
                    <SelectWrapper
                      label="Versión de API"
                      value={form.watch("api_version") || providerVersions.default}
                      onChange={(v) => form.setValue("api_version", v)}
                      options={providerVersions.versions.map(version => ({
                        value: version,
                        label: `${version}${providerVersions.description[version] ? ` - ${providerVersions.description[version]}` : ''}`
                      }))}
                      description={providerVersions.description[form.watch("api_version") || providerVersions.default] || ''}
                    />
                  );
                }
                return null;
              })()}

              <TextareaWrapper
                label="Descripción (opcional)"
                placeholder="Breve descripción del proveedor..."
                {...form.register("description")}
                rows={2}
              />
            </TabsContent>

            {/* TAB: Autenticación */}
            <TabsContent value="auth" className="space-y-4">
              <SelectWrapper
                label="Método de Autenticación"
                value={form.watch("auth_method")}
                onChange={(v) => form.setValue("auth_method", v as any)}
                options={[
                  {
                    value: "bearer",
                    label: "Bearer Token (Authorization: Bearer ...)",
                  },
                  {
                    value: "api_key",
                    label: "API Key en Header personalizado",
                  },
                  { value: "basic", label: "Basic Auth" },
                  { value: "custom", label: "Personalizado" },
                  { value: "none", label: "Sin autenticación" },
                ]}
              />

              {form.watch("auth_method") === "api_key" && (
                <InputWrapper
                  label="Nombre del Header"
                  placeholder="Ej: X-API-Key, xi-api-key, Authorization"
                  {...form.register("auth_header")}
                />
              )}

              {form.watch("auth_method") !== "none" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder={
                        isEditing
                          ? "••••••••••••• (dejar vacío para mantener)"
                          : "Introduce tu API Key"
                      }
                      {...form.register("api_key")}
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-md pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {apiKeyLink && (
                    <a
                      href={apiKeyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Obtener API Key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Botón de test */}
              <div className="pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={testConnection}
                  disabled={isTesting}
                  className="w-full"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Probando conexión...
                    </>
                  ) : testResult === "success" ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-success" />
                      Conexión exitosa - Probar de nuevo
                    </>
                  ) : testResult === "error" ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4 text-error" />
                      Error - Reintentar
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Probar Conexión
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* TAB: Avanzado */}
            <TabsContent value="advanced" className="space-y-4">
              {/* Selector de modelo para LLM */}
              {form.watch("type") === "llm" && (
                <div>
                  <SelectWrapper
                    label="Modelo a utilizar"
                    value={
                      (() => {
                        try {
                          const config = form.watch("config");
                          if (config) {
                            const parsed = JSON.parse(config);
                            return parsed.model || "";
                          }
                        } catch {}
                        return "";
                      })()
                    }
                    onChange={(model) => {
                      try {
                        const currentConfig = form.watch("config") || "{}";
                        const parsed = JSON.parse(currentConfig);
                        parsed.model = model;
                        form.setValue("config", JSON.stringify(parsed, null, 2));
                      } catch {
                        form.setValue("config", JSON.stringify({ model }, null, 2));
                      }
                    }}
                    options={(() => {
                      const slug = form.watch("slug") || presetSlug || "";
                      if (slug.includes("openai") || slug === "openai") {
                        return [
                          { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo" },
                          { value: "gpt-4", label: "GPT-4" },
                          { value: "gpt-4-32k", label: "GPT-4 32K" },
                          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
                          { value: "gpt-3.5-turbo-16k", label: "GPT-3.5 Turbo 16K" },
                        ];
                      } else if (slug.includes("claude") || slug === "claude") {
                        return [
                          { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
                          { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
                          { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
                          { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
                        ];
                      } else if (slug.includes("gemini") || slug === "gemini") {
                        return [
                          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
                          { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
                          { value: "gemini-pro", label: "Gemini Pro" },
                        ];
                      }
                      return [
                        { value: "", label: "Selecciona un modelo" },
                      ];
                    })()}
                  />
                  <p className="text-xs text-foreground-muted mt-1">
                    Selecciona el modelo específico que deseas usar
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InputWrapper
                  label="Coste por segundo ($)"
                  type="number"
                  step="0.001"
                  placeholder="0.05"
                  {...form.register("cost_per_second", {
                    valueAsNumber: true,
                  })}
                />
                <InputWrapper
                  label="Coste por request ($)"
                  type="number"
                  step="0.001"
                  placeholder="0.06"
                  {...form.register("cost_per_request", {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputWrapper
                  label="Duración máxima (segundos)"
                  type="number"
                  placeholder="10"
                  {...form.register("max_duration_seconds", {
                    valueAsNumber: true,
                  })}
                />
                <InputWrapper
                  label="Prioridad (menor = más prioridad)"
                  type="number"
                  placeholder="0"
                  {...form.register("priority", { valueAsNumber: true })}
                />
              </div>

              <TextareaWrapper
                label="Configuración adicional (JSON)"
                placeholder='{"model": "gpt-4", "temperature": 0.7}'
                {...form.register("config")}
                rows={4}
                className="font-mono text-sm"
              />

              <div className="flex items-center justify-between py-3 px-4 bg-background-secondary rounded-lg">
                <div>
                  <p className="font-medium">Activo</p>
                  <p className="text-sm text-foreground-muted">
                    El proveedor está disponible para usar
                  </p>
                </div>
                <Switch
                  checked={form.watch("is_active")}
                  onCheckedChange={(v) => form.setValue("is_active", v)}
                />
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-background-secondary rounded-lg">
                <div>
                  <p className="font-medium">Proveedor por Defecto</p>
                  <p className="text-sm text-foreground-muted">
                    Usar como proveedor principal de este tipo
                  </p>
                </div>
                <Switch
                  checked={form.watch("is_default")}
                  onCheckedChange={(v) => form.setValue("is_default", v)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between w-full">
              <div>
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={deleteProvider}
                    disabled={isDeleting}
                    className="text-error hover:text-error hover:bg-error/10"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Eliminar
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? "Guardar Cambios" : "Crear Proveedor"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

