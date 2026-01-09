"use client";

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Wand2, Dices, Upload, Loader2, Check, X, 
  ChevronLeft, ChevronRight, Sparkles, User,
  Image as ImageIcon, Mic, Save, AlertCircle,
  RefreshCw, Settings, Play, Pause
} from 'lucide-react'
import Link from 'next/link'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InputWrapper } from '@/components/ui/input-wrapper'
import { SelectWrapper } from '@/components/ui/select-wrapper'
import { TextareaWrapper } from '@/components/ui/textarea-wrapper'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useActiveProviders } from '@/hooks/use-active-providers'

// Constantes
const CHARACTER_CATEGORIES = [
  { id: 'protagonist', name: 'Protagonista', icon: '🦸' },
  { id: 'antagonist', name: 'Antagonista', icon: '🦹' },
  { id: 'secondary', name: 'Secundario', icon: '👥' },
  { id: 'professional', name: 'Profesional', icon: '👔' },
  { id: 'fantasy', name: 'Fantasía', icon: '🧙' },
  { id: 'child', name: 'Infantil', icon: '👶' },
]

const GENDERS = [
  { id: 'male', name: 'Masculino', icon: '👨' },
  { id: 'female', name: 'Femenino', icon: '👩' },
  { id: 'non_binary', name: 'No binario', icon: '🧑' },
]

const ETHNICITIES = [
  { id: 'caucasian', name: 'Caucásico' },
  { id: 'hispanic', name: 'Hispano/Latino' },
  { id: 'african', name: 'Africano' },
  { id: 'asian', name: 'Asiático' },
  { id: 'middle_eastern', name: 'Medio Oriente' },
  { id: 'south_asian', name: 'Sur de Asia' },
  { id: 'mixed', name: 'Mixto' },
]

const BODY_TYPES = [
  { value: 'slim', label: 'Delgado' },
  { value: 'athletic', label: 'Atlético' },
  { value: 'average', label: 'Normal' },
  { value: 'muscular', label: 'Musculoso' },
  { value: 'heavy', label: 'Corpulento' },
  { value: 'curvy', label: 'Curvilíneo' },
  { value: 'petite', label: 'Menudo' },
]

const FACE_SHAPES = [
  { value: 'oval', label: 'Ovalado' },
  { value: 'round', label: 'Redondo' },
  { value: 'square', label: 'Cuadrado' },
  { value: 'heart', label: 'Corazón' },
  { value: 'oblong', label: 'Alargado' },
  { value: 'diamond', label: 'Diamante' },
]

const HAIR_LENGTHS = [
  { value: 'bald', label: 'Calvo' },
  { value: 'buzz', label: 'Rapado' },
  { value: 'short', label: 'Corto' },
  { value: 'medium', label: 'Medio' },
  { value: 'long', label: 'Largo' },
  { value: 'very_long', label: 'Muy largo' },
]

// Estado inicial
const initialFormData = {
  name: '',
  category: 'protagonist',
  gender: 'male',
  description: '',
  physical: {
    exact_age: 30,
    height_cm: 175,
    weight_kg: 75,
    ethnicity: 'caucasian',
    body_type: 'average',
    build: '',
    skin_tone: '',
    face_shape: 'oval',
    eye_color: '',
    eye_shape: '',
    eyebrows: '',
    hair_color: '',
    hair_style: '',
    hair_length: 'short',
    hair_texture: '',
    facial_hair: '',
    nose_shape: '',
    lips: '',
    jawline: '',
    cheekbones: '',
    distinctive_marks: [] as string[],
    tattoos: [] as string[],
    scars: [] as string[],
  },
  wardrobe: {
    default_outfit: '',
    color_palette: [] as string[],
  },
  voice: {
    provider_id: '',
    voice_id: '',
    voice_name: '',
  },
  is_premium: false,
  is_active: true,
  is_baytt_character: true,
}

type FormData = typeof initialFormData

// Estados del proceso de generación
type GenerationState = 
  | 'idle'           // Esperando acción del usuario
  | 'generating_traits'  // Generando características con LLM
  | 'generating_images'  // Generando imágenes
  | 'selecting_images'   // Usuario seleccionando imágenes
  | 'training_lora'      // Entrenando LoRA
  | 'selecting_voice'    // Seleccionando voz
  | 'ready_to_save'      // Listo para guardar

export default function NewCharacterPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Proveedores activos
  const { data: providers, isLoading: loadingProviders } = useActiveProviders()
  
  // Estado del formulario
  const [formData, setFormData] = useState<FormData>(initialFormData)
  
  // Estado del proceso de generación
  const [generationState, setGenerationState] = useState<GenerationState>('idle')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationMessage, setGenerationMessage] = useState('')
  
  // Imágenes
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [generatedImages, setGeneratedImages] = useState<Array<{
    url: string
    seed: number
    pose: string
    expression: string
    selected: boolean
  }>>([])
  
  // LoRA
  const [loraResult, setLoraResult] = useState<{
    model_url: string
    trigger_word: string
    test_image_urls?: string[]
  } | null>(null)
  
  // Voces
  const [availableVoices, setAvailableVoices] = useState<any[]>([])
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  
  // Errores
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { toast } = useToast()
  
  // Verificar proveedores disponibles
  const hasImageProvider = providers?.mockMode || providers?.image
  const hasLoraProvider = providers?.mockMode || providers?.lora
  const hasLLMProvider = providers?.mockMode || providers?.llm
  const hasAudioProvider = providers?.mockMode || providers?.audio
  
  const canGenerateWithAI = hasImageProvider && hasLoraProvider
  
  // ============================================
  // HANDLERS DE FORMULARIO
  // ============================================
  
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const updatePhysical = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      physical: { ...prev.physical, [field]: value }
    }))
  }
  
  // ============================================
  // SUBIR IMÁGENES MANUALMENTE
  // ============================================
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setErrors({})
    
    // Validar archivos
    const validFiles: File[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, images: 'Solo se permiten imágenes' }))
        continue
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setErrors(prev => ({ ...prev, images: 'Las imágenes no pueden superar 10MB' }))
        continue
      }
      validFiles.push(file)
    }
    
    if (validFiles.length === 0) return
    
    // Subir a Supabase Storage
    setGenerationState('generating_images')
    setGenerationMessage('Subiendo imágenes...')
    
    try {
      console.log(`[FRONTEND] Subiendo ${validFiles.length} archivo(s)...`)
      const formDataUpload = new FormData()
      validFiles.forEach((file, index) => {
        formDataUpload.append('files', file)
        console.log(`[FRONTEND] Archivo ${index + 1}: ${file.name} (${file.size} bytes, ${file.type})`)
      })
      
      console.log('[FRONTEND] Enviando request a /api/upload/images...')
      const response = await fetch('/api/upload/images', {
        method: 'POST',
        body: formDataUpload
        // No añadir Content-Type header, el navegador lo hace automáticamente para FormData
      })
      
      console.log(`[FRONTEND] Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('[FRONTEND] Error response:', errorData)
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('[FRONTEND] Success response:', result)
      
      const { urls, count, errors: uploadErrors } = result
      
      if (!urls || urls.length === 0) {
        throw new Error('No se recibieron URLs de las imágenes subidas')
      }
      
      setUploadedImages(prev => [...prev, ...urls])
      setGenerationState('idle')
      
      const successMessage = uploadErrors && uploadErrors.length > 0
        ? `${urls.length} imagen(es) subida(s). ${uploadErrors.length} archivo(s) fallaron.`
        : `${urls.length} imagen(es) subida(s) correctamente`
      
      toast({
        title: '✅ Imágenes subidas',
        description: successMessage,
        variant: 'success'
      })
      
      if (uploadErrors && uploadErrors.length > 0) {
        console.warn('[FRONTEND] Algunas imágenes fallaron:', uploadErrors)
        toast({
          title: '⚠️ Advertencia',
          description: `Algunos archivos no se pudieron subir: ${uploadErrors.join('; ')}`,
          variant: 'default'
        })
      }
      
    } catch (err: any) {
      console.error('[FRONTEND] Error uploading images:', err)
      const errorMessage = err.message || 'Error desconocido al subir imágenes'
      setErrors(prev => ({ ...prev, images: errorMessage }))
      setGenerationState('idle')
      toast({
        title: 'Error al subir',
        description: errorMessage,
        variant: 'error'
      })
    }
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }
  
  // ============================================
  // GENERAR PERSONAJE ALEATORIO (TODO CON IA)
  // ============================================
  
  const generateRandomCharacter = async () => {
    if (!canGenerateWithAI) {
      toast({
        title: 'Proveedores no configurados',
        description: 'Configura proveedores de imagen y LoRA para generar personajes',
        variant: 'error'
      })
      return
    }
    
    setGenerationState('generating_traits')
    setGenerationProgress(0)
    setGenerationMessage('Generando características del personaje...')
    setErrors({})
    
    try {
      // PASO 1: Generar características con LLM
      const traitsResponse = await fetch('/api/characters/generate-random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          gender: formData.gender,
        })
      })
      
      if (!traitsResponse.ok) {
        const error = await traitsResponse.json()
        throw new Error(error.error || 'Error al generar características')
      }
      
      const traits = await traitsResponse.json()
      
      // Actualizar formulario con los datos generados
      setFormData(prev => ({
        ...prev,
        name: traits.name,
        description: traits.description,
        physical: { ...prev.physical, ...traits.physical },
        wardrobe: { ...prev.wardrobe, ...traits.wardrobe },
      }))
      
      setGenerationProgress(20)
      setGenerationMessage('Características generadas. Generando imágenes...')
      
      // PASO 2: Generar imágenes
      setGenerationState('generating_images')
      
      const imagesResponse = await fetch('/api/characters/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physical: traits.physical,
          gender: formData.gender,
          name: traits.name,
          wardrobe: traits.wardrobe?.default_outfit,
          num_images: 8,
        })
      })
      
      if (!imagesResponse.ok) {
        const error = await imagesResponse.json()
        throw new Error(error.error || 'Error al generar imágenes')
      }
      
      const { images } = await imagesResponse.json()
      
      setGeneratedImages(images.map((img: any) => ({
        ...img,
        selected: true // Seleccionar todas por defecto en modo aleatorio
      })))
      
      setGenerationProgress(60)
      setGenerationMessage('Imágenes generadas. Entrenando LoRA...')
      
      // PASO 3: Entrenar LoRA automáticamente
      setGenerationState('training_lora')
      
      const loraResponse = await fetch('/api/characters/train-lora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: traits.name,
          images: images.map((img: any) => img.url),
          // Asegurar que gender esté incluido en physical_traits
          physical_traits: {
            ...traits.physical,
            gender: formData.gender, // Incluir gender en physical_traits
          },
          wardrobe: traits.wardrobe, // Pasar vestuario
          visual_prompt_base: formData.description || '', // Pasar prompt visual base
        })
      })
      
      if (!loraResponse.ok) {
        const error = await loraResponse.json()
        throw new Error(error.error || 'Error al entrenar LoRA')
      }
      
      const loraData = await loraResponse.json()
      setLoraResult(loraData)
      
      setGenerationProgress(90)
      setGenerationMessage('LoRA entrenado. Selecciona una voz...')
      
      // PASO 4: Cargar voces disponibles
      await loadVoices()
      
      setGenerationProgress(100)
      setGenerationState('selecting_voice')
      setGenerationMessage('¡Personaje generado! Selecciona una voz para finalizar.')
      
      toast({
        title: '🎉 Personaje generado',
        description: 'Revisa el resultado y selecciona una voz',
        variant: 'success'
      })
      
    } catch (err: any) {
      setErrors(prev => ({ ...prev, generation: err.message }))
      setGenerationState('idle')
      toast({
        title: 'Error en la generación',
        description: err.message,
        variant: 'error'
      })
    }
  }
  
  // ============================================
  // GENERAR PERSONAJE (CON DATOS DEL FORMULARIO)
  // ============================================
  
  const generateCharacter = async () => {
    if (!canGenerateWithAI) {
      toast({
        title: 'Proveedores no configurados',
        description: 'Configura proveedores de imagen y LoRA para generar personajes',
        variant: 'error'
      })
      return
    }
    
    // Validar datos mínimos
    if (!formData.name) {
      setErrors(prev => ({ ...prev, name: 'El nombre es obligatorio' }))
      return
    }
    
    setGenerationState('generating_images')
    setGenerationProgress(0)
    setGenerationMessage('Generando imágenes del personaje...')
    setErrors({})
    
    try {
      // PASO 1: Generar imágenes basadas en el formulario
      const imagesResponse = await fetch('/api/characters/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physical: formData.physical,
          gender: formData.gender,
          name: formData.name,
          wardrobe: formData.wardrobe?.default_outfit,
          num_images: 8,
        })
      })
      
      if (!imagesResponse.ok) {
        const error = await imagesResponse.json()
        throw new Error(error.error || 'Error al generar imágenes')
      }
      
      const { images } = await imagesResponse.json()
      
      setGeneratedImages(images.map((img: any) => ({
        ...img,
        selected: false
      })))
      
      setGenerationProgress(40)
      setGenerationState('selecting_images')
      setGenerationMessage('Selecciona las mejores imágenes (mínimo 5)')
      
    } catch (err: any) {
      setErrors(prev => ({ ...prev, generation: err.message }))
      setGenerationState('idle')
      toast({
        title: 'Error al generar',
        description: err.message,
        variant: 'error'
      })
    }
  }
  
  // ============================================
  // ENTRENAR LoRA CON IMÁGENES SUBIDAS
  // ============================================
  
  const trainLoraWithUploadedImages = async () => {
    if (uploadedImages.length < 5) {
      toast({
        title: 'Imágenes insuficientes',
        description: 'Necesitas subir al menos 5 imágenes para entrenar el LoRA',
        variant: 'error'
      })
      return
    }
    
    if (!formData.name) {
      setErrors(prev => ({ ...prev, name: 'El nombre es obligatorio' }))
      return
    }
    
    setGenerationState('training_lora')
    setGenerationProgress(0)
    setGenerationMessage('Entrenando modelo LoRA con tus imágenes (esto puede tardar 10-20 minutos)...')
    setErrors({})
    
    try {
      setGenerationProgress(20)
      
      const loraResponse = await fetch('/api/characters/train-lora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: formData.name,
          images: uploadedImages, // Usar las imágenes subidas directamente
          // Pasar TODOS los parámetros físicos y vestimenta para que se usen en la generación de imágenes de prueba
          physical_traits: {
            ...formData.physical,
            gender: formData.gender, // Asegurar que gender esté incluido
          },
          wardrobe: formData.wardrobe,
          visual_prompt_base: formData.description || '',
        })
      })
      
      if (!loraResponse.ok) {
        const errorData = await loraResponse.json()
        // Asegurar que el error sea siempre un string
        let errorMessage = 'Error al entrenar LoRA'
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error
          } else {
            errorMessage = JSON.stringify(errorData.error)
          }
        }
        throw new Error(errorMessage)
      }
      
      setGenerationProgress(70)
      
      const loraData = await loraResponse.json()
      setLoraResult(loraData)
      
      setGenerationProgress(90)
      setGenerationMessage('LoRA entrenado. Cargando voces disponibles...')
      
      // Cargar voces
      await loadVoices()
      
      setGenerationProgress(100)
      setGenerationState('selecting_voice')
      setGenerationMessage('LoRA entrenado. Selecciona una voz para finalizar.')
      
      toast({
        title: '✅ LoRA entrenado',
        description: `Trigger word: ${loraData.trigger_word}`,
        variant: 'success'
      })
      
    } catch (err: any) {
      console.error('[TRAIN LoRA] Error:', err)
      // Asegurar que el mensaje sea siempre un string
      let errorMessage = 'Error desconocido al entrenar LoRA'
      if (err?.message) {
        errorMessage = typeof err.message === 'string' ? err.message : JSON.stringify(err.message)
      } else if (err) {
        errorMessage = typeof err === 'string' ? err : JSON.stringify(err)
      }
      
      setErrors(prev => ({ ...prev, lora: errorMessage }))
      setGenerationState('idle')
      setGenerationProgress(0)
      toast({
        title: 'Error al entrenar LoRA',
        description: errorMessage,
        variant: 'error'
      })
    }
  }
  
  // ============================================
  // CONFIRMAR IMÁGENES Y ENTRENAR LoRA
  // ============================================
  
  const confirmImagesAndTrainLora = async () => {
    const selectedImages = generatedImages.filter(img => img.selected)
    
    if (selectedImages.length < 5) {
      toast({
        title: 'Selección insuficiente',
        description: 'Selecciona al menos 5 imágenes',
        variant: 'error'
      })
      return
    }
    
    setGenerationState('training_lora')
    setGenerationProgress(50)
    setGenerationMessage('Entrenando modelo LoRA (esto puede tardar 10-20 minutos)...')
    
    try {
      const loraResponse = await fetch('/api/characters/train-lora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: formData.name,
          images: selectedImages.map(img => img.url)
        })
      })
      
      if (!loraResponse.ok) {
        const error = await loraResponse.json()
        throw new Error(error.error || 'Error al entrenar LoRA')
      }
      
      const loraData = await loraResponse.json()
      setLoraResult(loraData)
      
      setGenerationProgress(90)
      
      // Cargar voces
      await loadVoices()
      
      setGenerationProgress(100)
      setGenerationState('selecting_voice')
      setGenerationMessage('LoRA entrenado. Selecciona una voz para finalizar.')
      
      toast({
        title: '✅ LoRA entrenado',
        description: `Trigger word: ${loraData.trigger_word}`,
        variant: 'success'
      })
      
    } catch (err: any) {
      setErrors(prev => ({ ...prev, lora: err.message }))
      setGenerationState('selecting_images')
      toast({
        title: 'Error al entrenar LoRA',
        description: err.message,
        variant: 'error'
      })
    }
  }
  
  // ============================================
  // CARGAR Y SELECCIONAR VOCES
  // ============================================
  
  const loadVoices = async () => {
    try {
      const response = await fetch(`/api/voices?gender=${formData.gender}`)
      const data = await response.json()
      setAvailableVoices(data.voices || [])
    } catch (err) {
      console.error('Error loading voices:', err)
    }
  }
  
  const selectVoice = (voice: any) => {
    setFormData(prev => ({
      ...prev,
      voice: {
        provider_id: voice.provider_id || '',
        voice_id: voice.voice_id,
        voice_name: voice.name
      }
    }))
    setGenerationState('ready_to_save')
  }
  
  const playVoicePreview = (voice: any) => {
    if (playingVoice === voice.voice_id) {
      setPlayingVoice(null)
      return
    }
    
    const audio = new Audio(voice.preview_url)
    audio.onended = () => setPlayingVoice(null)
    audio.play()
    setPlayingVoice(voice.voice_id)
  }
  
  // ============================================
  // GUARDAR PERSONAJE
  // ============================================
  
  const saveCharacter = async () => {
    // Validaciones finales
    if (!formData.name) {
      toast({ title: 'Nombre requerido', variant: 'error' })
      return
    }
    
    const allImages = [
      ...uploadedImages,
      ...generatedImages.filter(img => img.selected).map(img => img.url)
    ]
    
    if (allImages.length < 5) {
      toast({ title: 'Mínimo 5 imágenes requeridas', variant: 'error' })
      return
    }
    
    if (!formData.voice.voice_id) {
      toast({ title: 'Selecciona una voz', variant: 'error' })
      return
    }
    
    setGenerationState('generating_traits') // Reusar para mostrar loading
    setGenerationMessage('Guardando personaje...')
    
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          category: formData.category,
          gender: formData.gender,
          description: formData.description || '',
          // Asegurar que gender esté incluido en physical_traits para buildPhotorealisticPrompt
          physical_traits: {
            ...formData.physical,
            gender: formData.gender, // Incluir gender en physical_traits
          } || {},
          wardrobe: formData.wardrobe || {}, // Guardar en metadata dentro de description
          reference_images: allImages,
          thumbnail_url: allImages[0],
          lora_model_url: loraResult?.model_url || null,
          lora_trigger_word: loraResult?.trigger_word || null,
          lora_test_image_urls: loraResult?.test_image_urls || [], // Array de imágenes generadas con LoRA para mostrar en detalle
          visual_prompt_base: formData.description || '', // Guardar descripción como prompt visual base
          voice_provider_id: formData.voice.provider_id,
          voice_id: formData.voice.voice_id,
          voice_name: formData.voice.voice_name,
          is_premium: formData.is_premium,
          is_active: formData.is_active !== undefined ? formData.is_active : true, // Asegurar que se guarde como activo
          // is_baytt_character: omitido - no existe en la tabla
          tags: [], // Array vacío por defecto
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('[SAVE CHARACTER] Error response:', errorData)
        
        // Extraer mensaje de error más descriptivo
        let errorMessage = errorData.error || 'Error al guardar personaje'
        if (errorData.details) {
          if (typeof errorData.details === 'string') {
            errorMessage += ': ' + errorData.details
          } else if (errorData.details.message) {
            errorMessage += ': ' + errorData.details.message
          }
        }
        
        throw new Error(errorMessage)
      }
      
      const saved = await response.json()
      console.log('[SAVE CHARACTER] ✅ Character saved successfully:', saved.data?.id)
      
      toast({
        title: '🎉 Personaje creado',
        description: `${formData.name} guardado correctamente`,
        variant: 'success'
      })
      
      router.push(`/admin/characters/${saved.data.id}`)
      
    } catch (err: any) {
      console.error('[SAVE CHARACTER] ❌ Error saving character:', err)
      setErrors(prev => ({ ...prev, save: err.message }))
      setGenerationState('ready_to_save')
      
      // Mostrar mensaje de error más descriptivo
      let errorMessage = err.message || 'Error desconocido al guardar personaje'
      if (typeof err.message === 'string' && err.message.length > 100) {
        errorMessage = err.message.substring(0, 100) + '...'
      }
      
      toast({
        title: 'Error al guardar',
        description: errorMessage,
        variant: 'error'
      })
    }
  }

  // ============================================
  // RENDER
  // ============================================
  
  if (loadingProviders) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            Crear Nuevo Personaje
          </h1>
          <p className="text-foreground-muted mt-2">
            Genera personajes hiperrealistas con IA o sube tus propias imágenes
          </p>
        </div>
        
        {/* Badges de estado de proveedores */}
        <div className="flex gap-2">
          {providers?.mockMode ? (
            <Badge variant="warning">Modo Mock</Badge>
          ) : (
            <>
              {hasImageProvider && <Badge variant="success">Imagen ✓</Badge>}
              {hasLoraProvider && <Badge variant="success">LoRA ✓</Badge>}
              {!hasImageProvider && <Badge variant="error">Sin Imagen</Badge>}
              {!hasLoraProvider && <Badge variant="error">Sin LoRA</Badge>}
            </>
          )}
        </div>
      </div>
      
      {/* Alerta si faltan proveedores */}
      {!canGenerateWithAI && !providers?.mockMode && (
        <Card className="mb-6 border-warning bg-warning/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium">Proveedores no configurados</p>
                <p className="text-sm text-foreground-muted">
                  Para generar personajes con IA, configura proveedores de imagen y LoRA, 
                  o activa el Modo Mock para desarrollo.
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <Link href="/admin/providers">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar Proveedores
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Barra de progreso global */}
      {generationState !== 'idle' && generationState !== 'selecting_images' && generationState !== 'selecting_voice' && generationState !== 'ready_to_save' && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium">{generationMessage}</p>
                <Progress value={generationProgress} className="mt-2 h-2" />
              </div>
              <span className="text-sm text-foreground-muted">{generationProgress}%</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: Formulario */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECCIÓN: Botones de acción rápida */}
          <Card>
            <CardHeader>
              <CardTitle>¿Cómo quieres crear el personaje?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Botón: Generar Aleatorio */}
                <Button
                  onClick={generateRandomCharacter}
                  disabled={!canGenerateWithAI || generationState !== 'idle'}
                  size="lg"
                  className="h-24 flex-col gap-2"
                  variant="default"
                >
                  <Dices className="h-8 w-8" />
                  <span>🎲 Generar Personaje Aleatorio</span>
                  <span className="text-xs opacity-70">La IA genera todo automáticamente</span>
                </Button>
                
                {/* Botón: Subir imágenes */}
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={generationState !== 'idle' && generationState !== 'selecting_images'}
                  size="lg"
                  className="h-24 flex-col gap-2"
                  variant="secondary"
                >
                  <Upload className="h-8 w-8" />
                  <span>📤 Subir Mis Imágenes</span>
                  <span className="text-xs opacity-70">Usa tus propias fotos</span>
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </CardContent>
          </Card>
          
          {/* SECCIÓN: Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputWrapper
                    label="Nombre del Personaje *"
                    placeholder="Ej: Detective Marcos"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    error={errors.name}
                  />
                </div>
                <div>
                  <SelectWrapper
                    label="Categoría"
                    value={formData.category}
                    onChange={(v) => updateFormData('category', v)}
                    options={CHARACTER_CATEGORIES.map(c => ({
                      value: c.id,
                      label: `${c.icon} ${c.name}`
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <SelectWrapper
                  label="Género"
                  value={formData.gender}
                  onChange={(v) => updateFormData('gender', v)}
                  options={GENDERS.map(g => ({
                    value: g.id,
                    label: `${g.icon} ${g.name}`
                  }))}
                />
                <SelectWrapper
                  label="Etnia"
                  value={formData.physical.ethnicity}
                  onChange={(v) => updatePhysical('ethnicity', v)}
                  options={ETHNICITIES.map(e => ({
                    value: e.id,
                    label: e.name
                  }))}
                />
              </div>
              
              <TextareaWrapper
                label="Descripción"
                placeholder="Breve descripción del personaje..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={2}
              />
            </CardContent>
          </Card>
          
          {/* SECCIÓN: Características físicas */}
          <Card>
            <CardHeader>
              <CardTitle>Características Físicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <InputWrapper
                  label="Edad"
                  type="number"
                  value={formData.physical.exact_age.toString()}
                  onChange={(e) => updatePhysical('exact_age', parseInt(e.target.value) || 0)}
                  min="1"
                  max="100"
                />
                <InputWrapper
                  label="Altura (cm)"
                  type="number"
                  value={formData.physical.height_cm.toString()}
                  onChange={(e) => updatePhysical('height_cm', parseInt(e.target.value) || 0)}
                  min="50"
                  max="250"
                />
                <InputWrapper
                  label="Peso (kg)"
                  type="number"
                  value={formData.physical.weight_kg.toString()}
                  onChange={(e) => updatePhysical('weight_kg', parseInt(e.target.value) || 0)}
                  min="20"
                  max="200"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <SelectWrapper
                  label="Tipo de cuerpo"
                  value={formData.physical.body_type}
                  onChange={(v) => updatePhysical('body_type', v)}
                  options={BODY_TYPES}
                />
                <SelectWrapper
                  label="Forma del rostro"
                  value={formData.physical.face_shape}
                  onChange={(v) => updatePhysical('face_shape', v)}
                  options={FACE_SHAPES}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <InputWrapper
                  label="Tono de piel"
                  placeholder="Ej: Morena clara, tono cálido"
                  value={formData.physical.skin_tone}
                  onChange={(e) => updatePhysical('skin_tone', e.target.value)}
                />
                <InputWrapper
                  label="Color de ojos"
                  placeholder="Ej: Marrón oscuro con destellos dorados"
                  value={formData.physical.eye_color}
                  onChange={(e) => updatePhysical('eye_color', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <InputWrapper
                  label="Color de cabello"
                  placeholder="Ej: Castaño oscuro"
                  value={formData.physical.hair_color}
                  onChange={(e) => updatePhysical('hair_color', e.target.value)}
                />
                <SelectWrapper
                  label="Largo de cabello"
                  value={formData.physical.hair_length}
                  onChange={(v) => updatePhysical('hair_length', v)}
                  options={HAIR_LENGTHS}
                />
                <InputWrapper
                  label="Estilo de cabello"
                  placeholder="Ej: Peinado hacia atrás"
                  value={formData.physical.hair_style}
                  onChange={(e) => updatePhysical('hair_style', e.target.value)}
                />
              </div>
              
              {formData.gender === 'male' && (
                <InputWrapper
                  label="Vello facial"
                  placeholder="Ej: Barba de 3 días, recortada"
                  value={formData.physical.facial_hair}
                  onChange={(e) => updatePhysical('facial_hair', e.target.value)}
                />
              )}
              
              <InputWrapper
                label="Rasgos distintivos"
                placeholder="Ej: Cicatriz en ceja izquierda, lunar en mejilla (separados por coma)"
                value={formData.physical.distinctive_marks?.join(', ') || ''}
                onChange={(e) => updatePhysical('distinctive_marks', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </CardContent>
          </Card>
          
          {/* SECCIÓN: Vestuario */}
          <Card>
            <CardHeader>
              <CardTitle>Vestuario</CardTitle>
            </CardHeader>
            <CardContent>
              <TextareaWrapper
                label="Outfit por defecto"
                placeholder="Ej: Cazadora de cuero negra, camiseta gris, jeans oscuros, botas negras"
                value={formData.wardrobe.default_outfit}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wardrobe: { ...prev.wardrobe, default_outfit: e.target.value }
                }))}
                rows={2}
              />
            </CardContent>
          </Card>
          
          {/* SECCIÓN: Imágenes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Imágenes de Referencia</span>
                <Badge variant={
                  (uploadedImages.length + generatedImages.filter(i => i.selected).length) >= 5 
                    ? 'success' 
                    : 'secondary'
                }>
                  {uploadedImages.length + generatedImages.filter(i => i.selected).length} / 5 mínimo
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Imágenes subidas manualmente */}
              {uploadedImages.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium mb-3">Imágenes subidas:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {uploadedImages.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeUploadedImage(i)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Imágenes generadas */}
              {generatedImages.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium mb-3">Imágenes generadas (click para seleccionar):</p>
                  <div className="grid grid-cols-4 gap-3">
                    {generatedImages.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (generationState === 'selecting_images' || generationState === 'idle') {
                            setGeneratedImages(prev => prev.map((item, idx) => 
                              idx === i ? { ...item, selected: !item.selected } : item
                            ))
                          }
                        }}
                        className={`
                          relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all
                          ${img.selected ? 'ring-4 ring-primary scale-95' : 'hover:scale-105'}
                        `}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        {img.selected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <Check className="h-8 w-8 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-white text-center">
                          {img.pose}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Error de imágenes */}
              {errors.images && (
                <p className="text-sm text-error mb-4">{errors.images}</p>
              )}
              
              {/* Botón generar personaje (solo cuando no hay imágenes) */}
              {generationState === 'idle' && uploadedImages.length === 0 && generatedImages.length === 0 && (
                <Button
                  onClick={generateCharacter}
                  disabled={!canGenerateWithAI || !formData.name}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  ✨ Generar Personaje
                </Button>
              )}
              
              {/* Botón generar con LoRA (cuando hay imágenes subidas) */}
              {generationState === 'idle' && uploadedImages.length > 0 && generatedImages.length === 0 && (
                <>
                  {uploadedImages.length >= 5 ? (
                    <Button
                      onClick={trainLoraWithUploadedImages}
                      disabled={!formData.name}
                      className="w-full"
                      size="lg"
                      variant="default"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      🎨 Generar con LoRA ({uploadedImages.length} imágenes)
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        disabled
                        className="w-full"
                        size="lg"
                        variant="outline"
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        🎨 Generar con LoRA
                      </Button>
                      <p className="text-sm text-center text-foreground-muted">
                        Sube al menos 5 imágenes para entrenar el LoRA ({uploadedImages.length}/5)
                      </p>
                    </div>
                  )}
                </>
              )}
              
              {/* Botón confirmar y entrenar LoRA (cuando hay imágenes generadas) */}
              {generationState === 'selecting_images' && (
                <Button
                  onClick={confirmImagesAndTrainLora}
                  disabled={generatedImages.filter(i => i.selected).length < 5}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Confirmar y Entrenar LoRA
                </Button>
              )}
              
              {/* Info del proveedor */}
              {canGenerateWithAI && (
                <p className="text-xs text-center text-foreground-muted mt-3">
                  Usando: {providers?.mockMode ? 'Mock (Desarrollo)' : providers?.image?.name || 'No configurado'}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* SECCIÓN: Selección de voz */}
          {(generationState === 'selecting_voice' || generationState === 'ready_to_save') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Voz del Personaje</span>
                  {formData.voice.voice_id && (
                    <Badge variant="success">
                      <Check className="h-3 w-3 mr-1" />
                      {formData.voice.voice_name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground-muted mb-4">
                  Selecciona la voz que usará este personaje en todas las películas:
                </p>
                
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  {availableVoices.map((voice) => (
                    <Card
                      key={voice.voice_id}
                      onClick={() => selectVoice(voice)}
                      className={`cursor-pointer transition-all ${
                        formData.voice.voice_id === voice.voice_id
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:bg-card-hover'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              playVoicePreview(voice)
                            }}
                          >
                            {playingVoice === voice.voice_id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <p className="font-medium">{voice.name}</p>
                            <p className="text-xs text-foreground-muted">
                              {voice.labels?.age} • {voice.labels?.accent}
                            </p>
                          </div>
                          {formData.voice.voice_id === voice.voice_id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* SECCIÓN: Configuración */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Personaje Premium</p>
                  <p className="text-sm text-foreground-muted">Solo disponible para planes premium</p>
                </div>
                <Switch
                  checked={formData.is_premium}
                  onCheckedChange={(v) => updateFormData('is_premium', v)}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Activo</p>
                  <p className="text-sm text-foreground-muted">Visible en la plataforma</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => updateFormData('is_active', v)}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-primary">Personaje BAYTT</p>
                  <p className="text-sm text-foreground-muted">Personaje oficial de BAYTT (vs. personaje real)</p>
                </div>
                <Switch
                  checked={formData.is_baytt_character}
                  onCheckedChange={(v) => updateFormData('is_baytt_character', v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* COLUMNA DERECHA: Preview */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Vista Previa</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Imagen principal */}
              {(uploadedImages[0] || generatedImages.find(i => i.selected)?.url) ? (
                <img
                  src={uploadedImages[0] || generatedImages.find(i => i.selected)?.url}
                  alt={formData.name}
                  className="w-full aspect-square object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full aspect-square bg-background-secondary rounded-lg flex items-center justify-center mb-4">
                  <User className="h-20 w-20 text-foreground-muted" />
                </div>
              )}
              
              {/* Info */}
              <h3 className="text-xl font-bold">{formData.name || 'Sin nombre'}</h3>
              <p className="text-foreground-muted text-sm mt-1">
                {formData.physical.exact_age} años • {formData.physical.height_cm}cm • {formData.physical.body_type}
              </p>
              
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge>{CHARACTER_CATEGORIES.find(c => c.id === formData.category)?.name || formData.category}</Badge>
                {loraResult && <Badge variant="success">LoRA ✓</Badge>}
                {formData.voice.voice_id && <Badge variant="info">Voz ✓</Badge>}
              </div>
              
              {/* LoRA info */}
              {loraResult && (
                <div className="mt-4 p-3 bg-success/10 rounded-lg">
                  <p className="text-sm font-medium text-success">LoRA Entrenado</p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Trigger: <code className="bg-background px-1 rounded">{loraResult.trigger_word}</code>
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-3">
              {/* Botón cancelar */}
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/admin/characters">
                  Cancelar
                </Link>
              </Button>
              
              {/* Botón guardar */}
              <Button
                onClick={saveCharacter}
                disabled={
                  generationState === 'generating_traits' ||
                  generationState === 'generating_images' ||
                  generationState === 'training_lora' ||
                  !formData.name ||
                  (uploadedImages.length + generatedImages.filter(i => i.selected).length) < 5 ||
                  !formData.voice.voice_id
                }
                className="w-full"
                size="lg"
              >
                <Save className="mr-2 h-5 w-5" />
                Guardar Personaje
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
