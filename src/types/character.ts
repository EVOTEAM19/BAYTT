// ============================================
// BAYTT - Character Types
// ============================================

// ============================================
// Character Categories
// ============================================

export interface CharacterCategory {
  id: string;
  name: string;
  description: string;
  count: number;
}

export const CHARACTER_CATEGORIES: CharacterCategory[] = [
  {
    id: "protagonist",
    name: "Protagonista",
    description: "Personaje principal de la historia",
    count: 60,
  },
  {
    id: "antagonist",
    name: "Antagonista",
    description: "Personaje que se opone al protagonista",
    count: 40,
  },
  {
    id: "secondary",
    name: "Secundario",
    description: "Personajes de apoyo en la trama",
    count: 80,
  },
  {
    id: "professional",
    name: "Profesional",
    description: "Doctores, abogados, policías, etc.",
    count: 40,
  },
  {
    id: "fantasy",
    name: "Fantasía",
    description: "Personajes de mundos fantásticos",
    count: 50,
  },
  {
    id: "child",
    name: "Infantil",
    description: "Personajes niños y adolescentes",
    count: 30,
  },
];

// Total: 300 personajes

// ============================================
// Age Ranges
// ============================================

export interface AgeRange {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const AGE_RANGES: AgeRange[] = [
  {
    id: "child",
    label: "Niño (5-12 años)",
    min: 5,
    max: 12,
  },
  {
    id: "teen",
    label: "Adolescente (13-17 años)",
    min: 13,
    max: 17,
  },
  {
    id: "young-adult",
    label: "Joven Adulto (18-25 años)",
    min: 18,
    max: 25,
  },
  {
    id: "adult",
    label: "Adulto (26-40 años)",
    min: 26,
    max: 40,
  },
  {
    id: "middle-aged",
    label: "Mediana Edad (41-60 años)",
    min: 41,
    max: 60,
  },
  {
    id: "senior",
    label: "Mayor (61+ años)",
    min: 61,
    max: 100,
  },
];

// ============================================
// Genders
// ============================================

export interface Gender {
  id: string;
  label: string;
  icon: string;
}

export const GENDERS: Gender[] = [
  {
    id: "male",
    label: "Masculino",
    icon: "♂️",
  },
  {
    id: "female",
    label: "Femenino",
    icon: "♀️",
  },
  {
    id: "non-binary",
    label: "No binario",
    icon: "⚧️",
  },
  {
    id: "other",
    label: "Otro",
    icon: "🌈",
  },
];

// ============================================
// Ethnicities
// ============================================

export interface Ethnicity {
  id: string;
  label: string;
}

export const ETHNICITIES: Ethnicity[] = [
  {
    id: "caucasian",
    label: "Caucásico",
  },
  {
    id: "african",
    label: "Africano",
  },
  {
    id: "asian",
    label: "Asiático",
  },
  {
    id: "hispanic",
    label: "Hispano",
  },
  {
    id: "middle-eastern",
    label: "Medio Oriente",
  },
  {
    id: "mixed",
    label: "Mixto",
  },
  {
    id: "other",
    label: "Otro",
  },
];

// ============================================
// Personality Traits
// ============================================

export interface PersonalityTrait {
  id: string;
  label: string;
  category: "positive" | "negative" | "neutral";
}

export const PERSONALITY_TRAITS: PersonalityTrait[] = [
  // Positive
  { id: "brave", label: "Valiente", category: "positive" },
  { id: "kind", label: "Amable", category: "positive" },
  { id: "intelligent", label: "Inteligente", category: "positive" },
  { id: "funny", label: "Gracioso", category: "positive" },
  { id: "loyal", label: "Leal", category: "positive" },
  { id: "optimistic", label: "Optimista", category: "positive" },
  { id: "confident", label: "Seguro", category: "positive" },
  { id: "creative", label: "Creativo", category: "positive" },
  { id: "determined", label: "Determinado", category: "positive" },
  { id: "empathetic", label: "Empático", category: "positive" },
  
  // Negative
  { id: "arrogant", label: "Arrogante", category: "negative" },
  { id: "selfish", label: "Egoísta", category: "negative" },
  { id: "cruel", label: "Cruel", category: "negative" },
  { id: "deceitful", label: "Engañoso", category: "negative" },
  { id: "pessimistic", label: "Pesimista", category: "negative" },
  { id: "cowardly", label: "Cobarde", category: "negative" },
  { id: "jealous", label: "Celoso", category: "negative" },
  { id: "stubborn", label: "Terco", category: "negative" },
  { id: "impulsive", label: "Impulsivo", category: "negative" },
  { id: "manipulative", label: "Manipulador", category: "negative" },
  
  // Neutral
  { id: "mysterious", label: "Misterioso", category: "neutral" },
  { id: "reserved", label: "Reservado", category: "neutral" },
  { id: "curious", label: "Curioso", category: "neutral" },
  { id: "independent", label: "Independiente", category: "neutral" },
  { id: "perfectionist", label: "Perfeccionista", category: "neutral" },
  { id: "analytical", label: "Analítico", category: "neutral" },
  { id: "adventurous", label: "Aventurero", category: "neutral" },
  { id: "calm", label: "Tranquilo", category: "neutral" },
  { id: "ambitious", label: "Ambicioso", category: "neutral" },
  { id: "pragmatic", label: "Pragmático", category: "neutral" },
];

// ============================================
// Physical Traits (for photorealistic prompts)
// ============================================

export interface CharacterPhysicalTraits {
  gender: "male" | "female" | "non-binary" | "other";
  exact_age: number;
  ethnicity?: string;
  height_cm?: number;
  weight_kg?: number;
  body_type?: string;
  build?: string;
  face_shape?: string;
  skin_tone?: string;
  eye_color?: string;
  eye_shape?: string;
  eyebrows?: string;
  hair_color?: string;
  hair_texture?: string;
  hair_style?: string;
  hair_length?: string;
  facial_hair?: string;
  nose_shape?: string;
  lips?: string;
  jawline?: string;
  cheekbones?: string;
  distinctive_marks?: string[];
  scars?: string[];
  tattoos?: string[];
}

// ============================================
// Wardrobe (for photorealistic prompts)
// ============================================

export interface CharacterWardrobe {
  default_outfit?: string;
  casual_outfit?: string;
  formal_outfit?: string;
  work_outfit?: string;
  accessories?: string[];
}

// ============================================
// Constants for Character Generator
// ============================================

export const BODY_TYPES = [
  { value: "slim", label: "Delgado" },
  { value: "average", label: "Promedio" },
  { value: "athletic", label: "Atlético" },
  { value: "muscular", label: "Musculoso" },
  { value: "curvy", label: "Curvilíneo" },
  { value: "plus", label: "Plus Size" },
];

export const FACE_SHAPES = [
  { value: "oval", label: "Oval" },
  { value: "round", label: "Redondo" },
  { value: "square", label: "Cuadrado" },
  { value: "heart", label: "Corazón" },
  { value: "diamond", label: "Diamante" },
  { value: "oblong", label: "Oblongo" },
  { value: "triangle", label: "Triangular" },
];

export const EYE_SHAPES = [
  { value: "almond", label: "Almendra" },
  { value: "round", label: "Redondos" },
  { value: "hooded", label: "Hundidos" },
  { value: "upturned", label: "Elevados" },
  { value: "downturned", label: "Caídos" },
  { value: "monolid", label: "Monolido" },
  { value: "wide-set", label: "Separados" },
  { value: "close-set", label: "Juntos" },
];

export const HAIR_LENGTHS = [
  { value: "bald", label: "Calvo" },
  { value: "buzz", label: "Rapado" },
  { value: "short", label: "Corto" },
  { value: "medium", label: "Medio" },
  { value: "long", label: "Largo" },
  { value: "very-long", label: "Muy Largo" },
];
