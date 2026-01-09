// ============================================
// BAYTT - Photorealistic Prompt Builder
// ============================================

import type {
  CharacterPhysicalTraits,
  CharacterWardrobe,
} from "@/types/character";

// ============================================
// CONFIGURACIÓN DE PROMPTS FOTORREALISTAS
// ============================================

const PHOTOREALISM_SUFFIX = `
shot on Canon EOS R5 with RF 85mm f/1.2L USM lens,
natural window lighting with soft fill,
shallow depth of field, f/2.0 aperture,
8K resolution, RAW photograph,
hyperrealistic skin texture with visible pores and fine details,
natural skin imperfections, subsurface scattering,
photorealistic hair with individual strands visible,
catchlights in eyes, natural eye moisture,
professional color grading, film grain
`
  .replace(/\n/g, " ")
  .trim();

const NEGATIVE_PROMPT = `
cartoon, anime, illustration, painting, drawing, art,
3d render, CGI, fake, artificial, plastic skin,
smooth skin, airbrushed, overprocessed,
blurry, low quality, low resolution,
deformed, distorted, disfigured,
bad anatomy, wrong proportions,
extra limbs, missing limbs,
watermark, signature, text,
oversaturated, HDR look
`
  .replace(/\n/g, " ")
  .trim();

// ============================================
// GENERADOR DE PROMPT PRINCIPAL
// ============================================

export function buildPhotorealisticPrompt(
  physical: CharacterPhysicalTraits,
  wardrobe?: CharacterWardrobe,
  pose: "portrait" | "full_body" | "profile" | "three_quarter" = "portrait",
  expression: "neutral" | "happy" | "serious" | "thoughtful" = "neutral"
): { prompt: string; negative_prompt: string } {
  const parts: string[] = [];

  // 1. TIPO DE FOTO Y POSE
  switch (pose) {
    case "portrait":
      parts.push(
        "Professional headshot portrait photograph, head and shoulders"
      );
      break;
    case "full_body":
      parts.push("Full body photograph, standing pose, full length shot");
      break;
    case "profile":
      parts.push("Side profile portrait photograph, 90 degree angle");
      break;
    case "three_quarter":
      parts.push("Three-quarter view portrait photograph, 45 degree angle");
      break;
  }

  // 2. GÉNERO Y EDAD
  const genderWord =
    physical.gender === "male"
      ? "man"
      : physical.gender === "female"
      ? "woman"
      : "person";
  parts.push(
    `${physical.exact_age} year old ${physical.ethnicity || ""} ${genderWord}`
  );

  // 3. COMPLEXIÓN
  if (physical.height_cm && physical.weight_kg) {
    parts.push(`${physical.height_cm}cm tall, ${physical.weight_kg}kg`);
  }
  if (physical.body_type) {
    parts.push(`${physical.body_type} body type`);
  }
  if (physical.build) {
    parts.push(physical.build);
  }

  // 4. ROSTRO
  if (physical.face_shape) {
    parts.push(`${physical.face_shape} face shape`);
  }
  if (physical.skin_tone) {
    parts.push(physical.skin_tone);
  }

  // 5. OJOS (muy importante para realismo)
  const eyeDescription = [
    physical.eye_color,
    physical.eye_shape ? `${physical.eye_shape} shaped eyes` : null,
    "natural eye moisture and catchlights",
  ]
    .filter(Boolean)
    .join(", ");
  if (eyeDescription) {
    parts.push(eyeDescription);
  }

  // 6. CEJAS
  if (physical.eyebrows) {
    parts.push(`${physical.eyebrows} eyebrows`);
  }

  // 7. CABELLO (muy importante)
  const hairDescription = [
    physical.hair_color,
    physical.hair_texture,
    physical.hair_style,
    physical.hair_length ? `${physical.hair_length} length` : null,
    "individual hair strands visible",
  ]
    .filter(Boolean)
    .join(", ");
  if (hairDescription) {
    parts.push(`hair: ${hairDescription}`);
  }

  // 8. VELLO FACIAL (si aplica)
  if (physical.facial_hair) {
    parts.push(physical.facial_hair);
  }

  // 9. RASGOS FACIALES
  if (physical.nose_shape) {
    parts.push(`${physical.nose_shape} nose`);
  }
  if (physical.lips) {
    parts.push(`${physical.lips} lips`);
  }
  if (physical.jawline) {
    parts.push(`${physical.jawline} jawline`);
  }
  if (physical.cheekbones) {
    parts.push(`${physical.cheekbones} cheekbones`);
  }

  // 10. MARCAS DISTINTIVAS
  if (physical.distinctive_marks?.length) {
    parts.push(
      `distinctive features: ${physical.distinctive_marks.join(", ")}`
    );
  }
  if (physical.scars?.length) {
    parts.push(`scars: ${physical.scars.join(", ")}`);
  }
  if (physical.tattoos?.length) {
    parts.push(`tattoos: ${physical.tattoos.join(", ")}`);
  }

  // 11. EXPRESIÓN
  const expressionMap = {
    neutral: "neutral calm expression, relaxed face",
    happy: "genuine warm smile, happy expression, smile lines",
    serious: "serious focused expression, intense gaze",
    thoughtful: "thoughtful contemplative expression, slight head tilt",
  };
  parts.push(expressionMap[expression]);

  // 12. VESTUARIO (si se proporciona)
  if (wardrobe?.default_outfit) {
    parts.push(`wearing ${wardrobe.default_outfit}`);
  }

  // 13. FONDO
  parts.push("soft gradient gray studio background");

  // 14. SUFIJO DE FOTORREALISMO
  parts.push(PHOTOREALISM_SUFFIX);

  return {
    prompt: parts.join(", "),
    negative_prompt: NEGATIVE_PROMPT,
  };
}

// ============================================
// VARIACIONES DE POSE
// ============================================

export function generatePoseVariations(
  physical: CharacterPhysicalTraits,
  wardrobe?: CharacterWardrobe
): {
  pose: string;
  expression: string;
  prompt: string;
  negative_prompt: string;
}[] {
  const poses: {
    pose: "portrait" | "full_body" | "profile" | "three_quarter";
    expression: "neutral" | "happy" | "serious" | "thoughtful";
  }[] = [
    { pose: "portrait", expression: "neutral" },
    { pose: "portrait", expression: "happy" },
    { pose: "portrait", expression: "serious" },
    { pose: "three_quarter", expression: "neutral" },
    { pose: "three_quarter", expression: "thoughtful" },
    { pose: "profile", expression: "neutral" },
    { pose: "full_body", expression: "neutral" },
    { pose: "full_body", expression: "serious" },
  ];

  return poses.map(({ pose, expression }) => ({
    pose,
    expression,
    ...buildPhotorealisticPrompt(physical, wardrobe, pose, expression),
  }));
}

// ============================================
// PROMPT PARA ESCENAS DE PELÍCULA
// ============================================

export function buildScenePrompt(
  character: {
    physical: CharacterPhysicalTraits;
    wardrobe?: CharacterWardrobe;
    lora_trigger_word?: string;
  },
  scene: {
    action: string;
    environment: string;
    lighting: string;
    camera_angle: string;
    mood: string;
  }
): { prompt: string; negative_prompt: string } {
  const parts: string[] = [];

  // Si tiene LoRA, usar trigger word
  if (character.lora_trigger_word) {
    parts.push(character.lora_trigger_word);
  }

  // Descripción del personaje (versión corta si tiene LoRA)
  if (character.lora_trigger_word) {
    // Con LoRA solo necesitamos detalles básicos
    parts.push(
      `${character.physical.exact_age} year old ${character.physical.gender}`
    );
    if (character.wardrobe?.default_outfit) {
      parts.push(`wearing ${character.wardrobe.default_outfit}`);
    }
  } else {
    // Sin LoRA, descripción completa
    const fullPrompt = buildPhotorealisticPrompt(
      character.physical,
      character.wardrobe
    ).prompt;
    parts.push(fullPrompt.split(",").slice(0, 15).join(","));
  }

  // Acción
  parts.push(scene.action);

  // Ambiente
  parts.push(`in ${scene.environment}`);

  // Iluminación
  parts.push(`${scene.lighting} lighting`);

  // Cámara
  parts.push(`${scene.camera_angle} shot`);

  // Mood
  parts.push(`${scene.mood} atmosphere`);

  // Calidad cinematográfica
  parts.push(
    "cinematic still frame, movie quality, 35mm film, anamorphic lens, professional cinematography"
  );

  return {
    prompt: parts.join(", "),
    negative_prompt: NEGATIVE_PROMPT,
  };
}

