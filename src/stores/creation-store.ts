// ============================================
// BAYTT - Creation Store (Zustand)
// ============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CreationState {
  // Wizard state
  currentStep: number;
  totalSteps: number;
  
  // Movie data
  duration_minutes: number | null;
  genre: string | null;
  user_prompt: string;
  user_plot: string;
  ending_type: "user" | "ai";
  user_ending: string;
  character_ids: string[];
  use_random_characters: boolean; // true = generar aleatorios, false = usar librería
  random_characters_count: number; // número de personajes aleatorios a generar
  
  // Movie ID after creation
  movie_id: string | null;
  
  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setDuration: (minutes: number) => void;
  setGenre: (genre: string) => void;
  setUserPrompt: (prompt: string) => void;
  setUserPlot: (plot: string) => void;
  setEndingType: (type: "user" | "ai") => void;
  setUserEnding: (ending: string) => void;
  setCharacterIds: (ids: string[]) => void;
  setUseRandomCharacters: (use: boolean) => void;
  setRandomCharactersCount: (count: number) => void;
  setMovieId: (id: string) => void;
  reset: () => void;
  
  // Validation helpers
  canProceedToNextStep: () => boolean;
  getStepValidation: (step: number) => { isValid: boolean; error?: string };
}

const initialState = {
  currentStep: 1,
  totalSteps: 7,
  duration_minutes: null,
  genre: null,
  user_prompt: "",
  user_plot: "",
  ending_type: "ai" as const,
  user_ending: "",
  character_ids: [],
  use_random_characters: true, // Por defecto, personajes aleatorios activados
  random_characters_count: 3,
  movie_id: null,
};

export const useCreationStore = create<CreationState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setStep: (step: number) => {
        const { totalSteps } = get();
        if (step >= 1 && step <= totalSteps) {
          set({ currentStep: step });
        }
      },
      
      nextStep: () => {
        const { currentStep, totalSteps, canProceedToNextStep } = get();
        if (canProceedToNextStep() && currentStep < totalSteps) {
          set({ currentStep: currentStep + 1 });
        }
      },
      
      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      
      setDuration: (minutes: number) => set({ duration_minutes: minutes }),
      setGenre: (genre: string) => set({ genre }),
      setUserPrompt: (prompt: string) => set({ user_prompt: prompt }),
      setUserPlot: (plot: string) => set({ user_plot: plot }),
      setEndingType: (type: "user" | "ai") => set({ ending_type: type }),
      setUserEnding: (ending: string) => set({ user_ending: ending }),
      setCharacterIds: (ids: string[]) => set({ character_ids: ids }),
      setUseRandomCharacters: (use: boolean) => set({ use_random_characters: use }),
      setRandomCharactersCount: (count: number) => set({ random_characters_count: count }),
      setMovieId: (id: string) => set({ movie_id: id }),
      
      reset: () => set(initialState),
      
      canProceedToNextStep: () => {
        const { currentStep, getStepValidation } = get();
        const validation = getStepValidation(currentStep);
        return validation.isValid;
      },
      
      getStepValidation: (step: number) => {
        const state = get();
        
        switch (step) {
          case 1: // Duration
            if (!state.duration_minutes) {
              return { isValid: false, error: "Debes seleccionar una duración" };
            }
            return { isValid: true };
            
          case 2: // Genre
            if (!state.genre) {
              return { isValid: false, error: "Debes seleccionar un género" };
            }
            return { isValid: true };
            
          case 3: // Description
            if (state.user_prompt.length < 50) {
              return {
                isValid: false,
                error: "La descripción debe tener al menos 50 caracteres",
              };
            }
            return { isValid: true };
            
          case 4: // Plot (optional)
            return { isValid: true };
            
          case 5: // Ending
            if (state.ending_type === "user" && state.user_ending.length < 20) {
              return {
                isValid: false,
                error: "El final debe tener al menos 20 caracteres",
              };
            }
            return { isValid: true };
            
          case 6: // Characters (optional)
            return { isValid: true };
            
          case 7: // Review
            return { isValid: true };
            
          default:
            return { isValid: false };
        }
      },
    }),
    {
      name: "baytt-creation-storage",
      partialize: (state) => ({
        duration_minutes: state.duration_minutes,
        genre: state.genre,
        user_prompt: state.user_prompt,
        user_plot: state.user_plot,
        ending_type: state.ending_type,
        user_ending: state.user_ending,
        character_ids: state.character_ids,
        use_random_characters: state.use_random_characters,
        random_characters_count: state.random_characters_count,
        currentStep: state.currentStep,
      }),
    }
  )
);
