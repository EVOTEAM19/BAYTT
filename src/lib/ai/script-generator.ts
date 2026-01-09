// ============================================
// BAYTT - Script Generator
// ============================================

import { getAIConfig, getProviderWithKey } from "./config";
import { callLLMProvider, type LLMGenerationParams } from "./providers";
import { decryptApiKey } from "@/lib/encryption/api-keys";
import type { GeneratedScript, SceneOutline } from "@/types/api";
import type { GenerateScriptRequest } from "@/types/api";

// ============================================
// Types
// ============================================

interface GenerateScriptParams {
  movie_id: string;
  user_prompt: string;
  user_plot?: string;
  user_ending?: string;
  genre: string;
  duration_minutes: number;
  character_ids?: string[];
  character_names?: string[];
}

interface ExtendedSceneOutline extends SceneOutline {
  action_description?: string;
  visual_style?: string;
  camera_movement?: string;
  lighting?: string;
  sound_effects?: string[];
  visual_context?: string;
}

interface ScriptResponse {
  title: string;
  summary: string;
  scenes: ExtendedSceneOutline[];
}

// ============================================
// System Prompt
// ============================================

const SYSTEM_PROMPT = `Eres un guionista cinematográfico profesional de nivel internacional. Creas guiones ULTRA-DETALLADOS con estructura narrativa perfecta y continuidad visual impecable.

REGLAS CRÍTICAS ABSOLUTAS:
1. Cada escena = EXACTAMENTE 10 segundos de video (ni más, ni menos)
2. CONTINUIDAD VISUAL PERFECTA: Mantener exactamente la misma ropa, posición, iluminación, objetos y ubicación entre escenas consecutivas
3. Los diálogos deben ser naturales, cinematográficos y apropiados para el género
4. Descripciones visuales ULTRA-DETALLADAS: cada elemento visible debe estar especificado (color, textura, posición, tamaño, movimiento)
5. CONTEXTO VISUAL OBLIGATORIO: Cada escena debe especificar qué elementos visuales se mantienen de la anterior
6. TRANSICIONES: Especificar cómo se conecta visualmente con la siguiente escena
7. El visual_prompt debe ser tan detallado que un artista pueda recrear la escena exactamente

FORMATO JSON OBLIGATORIO (TODOS los campos son requeridos):
{
  "title": "string",
  "summary": "string (2-3 frases que resuman la historia completa)",
  "scenes": [{
    "scene_number": number,
    "title": "string (título descriptivo de la escena)",
    "description": "Descripción narrativa COMPLETA y detallada de lo que sucede",
    "dialogue": "string o null (diálogo exacto si hay, con indicación de quién habla)",
    "action_description": "Descripción DETALLADA de todas las acciones físicas que ocurren",
    "characters": ["nombre1", "nombre2"] (nombres exactos de personajes presentes),
    "duration_seconds": 10,
    "visual_prompt": "PROMPT ULTRA-DETALLADO: [Ángulo de cámara específico], [Composición exacta], [Iluminación detallada con dirección y color], [Colores dominantes y paleta], [Estilo visual], [Movimiento de cámara], [Expresiones faciales], [Ropa y apariencia detallada], [Objetos y props visibles], [Ambiente y decorado completo], [Efectos visuales si hay]",
    "visual_style": "cinematográfico/anime/realista/hiperrealista/etc (especificar estilo exacto)",
    "camera_movement": "static/pan-left/pan-right/zoom-in/zoom-out/tracking-forward/tracking-backward/dolly-in/dolly-out (especificar movimiento exacto)",
    "camera_angle": "eye-level/low-angle/high-angle/bird-eye/worm-eye/dutch-angle (especificar ángulo)",
    "lighting": "Descripción COMPLETA: dirección (frontal/lateral/trasera), intensidad, color temperatura, sombras, contraste, ambiente",
    "audio_prompt": "Descripción COMPLETA de sonido: ambiente (ruido de fondo específico), efectos de sonido (lista detallada), tono y emoción de voz si hay diálogo, volumen relativo",
    "music_mood": "epic/tense/romantic/sad/happy/mysterious/action/horror/comedy (especificar mood exacto)",
    "sound_effects": ["efecto1", "efecto2"] (lista completa de efectos de sonido necesarios),
    "transition_to_next": "Descripción DETALLADA de cómo conectar visualmente: qué elementos se mantienen, qué cambia, cómo fluye la transición",
    "visual_context": "CONTEXTO CRÍTICO: Lista EXACTA de elementos que DEBEN mantenerse idénticos para continuidad: [Personaje X en posición Y con ropa Z], [Objeto A en ubicación B], [Iluminación C con características D], [Decorado E con elementos F]",
    "character_positions": "Posiciones exactas de cada personaje en la escena (izquierda, centro, derecha, distancia de cámara)",
    "character_appearance": "Descripción detallada de apariencia de cada personaje (ropa, peinado, expresión, postura)"
  }]
}

CONTINUIDAD ENTRE ESCENAS:
- La escena N debe mantener TODOS los elementos visuales especificados en visual_context de la escena N-1
- Si un personaje cambia de posición, especificar el movimiento exacto
- Si cambia la iluminación, explicar la transición
- Si hay cambio de ubicación, especificar cómo se conecta visualmente

IMPORTANTE: 
- Responde SOLO con JSON válido, sin texto adicional antes o después
- Cada visual_prompt debe tener mínimo 150 palabras de descripción
- Sé extremadamente específico en todos los detalles visuales y de audio`;

// ============================================
// Main Function
// ============================================

export async function generateScript(
  params: GenerateScriptParams
): Promise<GeneratedScript> {
  const config = await getAIConfig();

  // MOCK MODE
  if (config.mockMode || !config.llmProvider) {
    return generateMockScript(params);
  }

  // REAL MODE
  const provider = config.llmProvider;
  const providerWithKey = await getProviderWithKey(provider.id);

  if (!providerWithKey) {
    throw new Error("Failed to get provider with API key");
  }

  const scenesNeeded = Math.ceil((params.duration_minutes * 60) / 10);
  const userPrompt = buildUserPrompt(params, scenesNeeded);

  // Llamar a LLM provider
  const llmParams: LLMGenerationParams = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    model: (provider.config as any)?.model,
    temperature: 0.7,
    maxTokens: 4000,
  };

  const response = await callLLMProvider(provider, llmParams);
  const scriptData = parseScriptResponse(response.content, params.movie_id);

  return scriptData;
}

// ============================================
// Helper Functions
// ============================================

function buildUserPrompt(
  params: GenerateScriptParams,
  scenesNeeded: number
): string {
  let prompt = `Crea un guión cinematográfico completo para una película de ${params.duration_minutes} minutos (${scenesNeeded} escenas de 10 segundos cada una).

GÉNERO: ${params.genre}

PROMPT DEL USUARIO: ${params.user_prompt}`;

  if (params.user_plot) {
    prompt += `\n\nTARMA DEL USUARIO: ${params.user_plot}`;
  }

  if (params.user_ending) {
    prompt += `\n\nFINAL ESPECÍFICO DEL USUARIO: ${params.user_ending}`;
  }

  if (params.character_names && params.character_names.length > 0) {
    prompt += `\n\nPERSONAJES DISPONIBLES: ${params.character_names.join(", ")}`;
    prompt += `\n\nUsa estos personajes en el guión cuando sea apropiado.`;
  }

  prompt += `\n\nREQUISITOS TÉCNICOS:
- Exactamente ${scenesNeeded} escenas
- Cada escena = 10 segundos exactos
- Mantener continuidad visual entre escenas
- Visual prompts ultra-detallados para generación de video con IA
- Descripciones de audio y música para cada escena
- Transiciones claras entre escenas

Responde SOLO con el JSON del guión, sin texto adicional.`;

  return prompt;
}

function parseScriptResponse(
  responseContent: string,
  movieId: string
): GeneratedScript {
  try {
    // Intentar extraer JSON del response (puede venir con markdown code blocks)
    let jsonString = responseContent.trim();

    // Remover markdown code blocks si existen
    if (jsonString.startsWith("```")) {
      const lines = jsonString.split("\n");
      const startIndex = lines.findIndex((line) => line.includes("{")) || 0;
      const endIndex =
        lines.findIndex((line, idx) => idx > startIndex && line.includes("}")) ||
        lines.length - 1;
      jsonString = lines.slice(startIndex, endIndex + 1).join("\n");
    }

    // Remover ```json y ``` si existen
    jsonString = jsonString.replace(/^```json\s*/i, "").replace(/```\s*$/, "");

    const scriptData: ScriptResponse = JSON.parse(jsonString);

    // Validar estructura
    if (!scriptData.title || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
      throw new Error("Invalid script structure");
    }

    // Convertir a GeneratedScript
    const scenes: SceneOutline[] = scriptData.scenes.map((scene) => ({
      scene_number: scene.scene_number,
      title: scene.title,
      description: scene.description,
      dialogue: scene.dialogue || null,
      characters: scene.characters || [],
      duration_seconds: scene.duration_seconds || 10,
      visual_prompt: scene.visual_prompt,
      audio_prompt: scene.audio_prompt || null,
      music_mood: scene.music_mood || null,
      transition_to_next: scene.transition_to_next || null,
    }));

    // Generar full_text combinando todas las escenas
    const fullText = scenes
      .map(
        (scene) =>
          `ESCENA ${scene.scene_number}: ${scene.title}\n${scene.description}${
            scene.dialogue ? `\n${scene.dialogue}` : ""
          }`
      )
      .join("\n\n");

    return {
      movie_id: movieId,
      full_text: fullText,
      summary: scriptData.summary || "",
      total_scenes: scenes.length,
      scenes,
      is_approved: false,
    };
  } catch (error) {
    console.error("Error parsing script response:", error);
    console.error("Response content:", responseContent);
    throw new Error(
      `Failed to parse script response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================
// Mock Script Generator
// ============================================

function generateMockScript(
  params: GenerateScriptParams
): GeneratedScript {
  const scenesNeeded = Math.ceil((params.duration_minutes * 60) / 10);
  const scenes: SceneOutline[] = [];

  // Generar variaciones de contenido para cada escena
  const sceneVariations = [
    { action: "introducción", mood: "misterioso", location: "exterior" },
    { action: "desarrollo", mood: "tenso", location: "interior" },
    { action: "conflicto", mood: "dramático", location: "exterior" },
    { action: "clímax", mood: "intenso", location: "interior" },
    { action: "resolución", mood: "satisfactorio", location: "exterior" },
  ];

  for (let i = 1; i <= scenesNeeded; i++) {
    const variation = sceneVariations[i % sceneVariations.length];
    const sceneProgress = i / scenesNeeded;
    
    scenes.push({
      scene_number: i,
      title: `Escena ${i}: ${variation.action.charAt(0).toUpperCase() + variation.action.slice(1)}`,
      description: `En esta escena ${i} de ${scenesNeeded}, ${params.user_prompt}. La acción se desarrolla en un ${variation.location} con un ambiente ${variation.mood}. Este es un momento ${sceneProgress < 0.3 ? 'inicial' : sceneProgress < 0.7 ? 'central' : 'final'} de la historia. Los personajes se enfrentan a nuevos desafíos y la trama avanza hacia su conclusión.`,
      dialogue:
        i % 3 === 0
          ? `Personaje 1: "Esto es crucial para la escena ${i}. Necesitamos avanzar."\nPersonaje 2: "Entiendo, pero debemos ser cuidadosos."`
          : i % 4 === 0
          ? `Narrador: "La situación se complica en la escena ${i}..."`
          : null,
      characters: params.character_names?.slice(0, 2) || ["Personaje 1", "Personaje 2"],
      duration_seconds: 10,
      visual_prompt: `Cinematographic ${variation.location} shot, scene ${i} of ${scenesNeeded}, ${variation.mood} atmosphere, ${params.user_prompt}, professional ${variation.mood} lighting, cinematic composition, detailed visual description, ${sceneProgress < 0.3 ? 'establishing shot' : sceneProgress < 0.7 ? 'medium shot' : 'close-up'}`,
      audio_prompt: `Ambient ${variation.location} sound, ${variation.mood} atmosphere, scene ${i} specific audio cues`,
      music_mood: i % 2 === 0 ? "epic" : "tense",
      transition_to_next:
        i < scenesNeeded
          ? `Smooth transition to scene ${i + 1}: maintaining ${variation.location} continuity`
          : null,
    });
  }

  const fullText = scenes
    .map(
      (scene) =>
        `ESCENA ${scene.scene_number}: ${scene.title}\n${scene.description}${
          scene.dialogue ? `\n${scene.dialogue}` : ""
        }`
    )
    .join("\n\n");

  return {
    movie_id: params.movie_id,
    full_text: fullText,
    summary: `Película de ${params.duration_minutes} minutos sobre: ${params.user_prompt}`,
    total_scenes: scenes.length,
    scenes,
    is_approved: false,
  };
}
