"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { 
  Film, Wand2, Loader2, AlertCircle, Check, Users,
  Shuffle, Library, UserCircle, ChevronRight, Settings,
  Clock, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InputWrapper } from '@/components/ui/input-wrapper'
import { TextareaWrapper } from '@/components/ui/textarea-wrapper'
import { SelectWrapper } from '@/components/ui/select-wrapper'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { GENRES } from '@/types/movie'

// Schema base - los límites se cargarán desde la configuración (20 segundos mínimo)
const getCreateMovieSchema = (minDuration: number = 20/60, maxDuration: number = 180) => z.object({
  title: z.string().min(3).max(100),
  prompt: z.string().min(20).max(5000),
  description: z.string().max(500).optional(),
  genre: z.string(),
  target_duration_minutes: z.number()
    .min(Math.max(0, minDuration - 0.005), `La duración mínima es ${minDuration >= 1 ? `${minDuration} minuto${minDuration > 1 ? 's' : ''}` : `${Math.round(minDuration * 60)} segundos`}`) // Permitir pequeña diferencia por precisión de punto flotante (0.33 vs 0.333...)
    .max(maxDuration, `La duración máxima es ${maxDuration} minutos`),
  style: z.string(),
  tone: z.string(),
  age_rating: z.string(),
  is_premium: z.boolean(),
  character_mode: z.enum(['random', 'select', 'mixed']),
  random_character_count: z.number().min(1).max(20).optional(),
  random_character_source: z.enum(['baytt', 'user', 'both']).optional(),
  selected_character_ids: z.array(z.string()).optional(),
})

type CreateMovieForm = z.infer<ReturnType<typeof getCreateMovieSchema>>

export function MovieCreationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<'info' | 'characters' | 'review'>('info')
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([])
  
  // Verificar proveedores
  const { data: providersStatus, isLoading: loadingProviders } = useQuery({
    queryKey: ['providers-status'],
    queryFn: async () => {
      const res = await fetch('/api/providers/status')
      return res.json()
    }
  })
  
  // Cargar personajes disponibles
  const { data: charactersData } = useQuery({
    queryKey: ['characters-for-movie'],
    queryFn: async () => {
      const res = await fetch('/api/characters?limit=100')
      return res.json()
    }
  })
  
  // Cargar configuración de límites de duración
  const { data: adminConfig } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/config')
      return res.json()
    }
  })
  
  const durationLimits = adminConfig?.data?.generation_limits || {
    min_duration_minutes: 20/60, // 20 segundos mínimo
    max_duration_minutes: 180
  }
  
  const minDuration = durationLimits.min_duration_minutes || 20/60 // 20 segundos por defecto
  const maxDuration = durationLimits.max_duration_minutes || 180
  
  // Redondear minDuration a 2 decimales para evitar problemas de precisión
  const safeMinDuration = Math.round(minDuration * 100) / 100
  
  const form = useForm<CreateMovieForm>({
    resolver: zodResolver(getCreateMovieSchema(safeMinDuration, maxDuration)),
    mode: 'onChange', // Validar en cada cambio para tener isValid actualizado
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      prompt: '',
      description: '',
      genre: 'drama',
      target_duration_minutes: Math.max(safeMinDuration, Math.min(10, maxDuration)),
      style: 'cinematic',
      tone: 'neutral',
      age_rating: 'PG-13',
      is_premium: false,
      character_mode: 'random',
      random_character_count: 5,
      random_character_source: 'baytt',
      selected_character_ids: [],
    }
  })
  
  const characterMode = form.watch('character_mode')
  
  // Validar formulario cuando se llega al paso de revisión
  useEffect(() => {
    if (step === 'review') {
      console.log('[MOVIE FORM] Validating form on review step...')
      form.trigger().then((isValid) => {
        console.log('[MOVIE FORM] Form validation result:', isValid)
        if (!isValid) {
          console.error('[MOVIE FORM] Form has errors:', form.formState.errors)
          // Mostrar errores de validación en el paso de revisión
          const errorFields = Object.keys(form.formState.errors)
          if (errorFields.length > 0) {
            toast({
              title: 'Hay errores en el formulario',
              description: `Por favor, corrige: ${errorFields.join(', ')}`,
              variant: 'error'
            })
          }
        }
      })
    }
  }, [step, form])
  
  // Mutation para crear película
  const createMutation = useMutation({
    mutationFn: async (data: CreateMovieForm) => {
      // Preparar datos de personajes según el modo
      const characterSelection = {
        mode: data.character_mode,
        selected_characters: data.character_mode !== 'random' 
          ? selectedCharacters.map(c => ({
              character_id: c.id,
              role: c.selected_role || 'supporting'
            }))
          : undefined,
        random_config: data.character_mode !== 'select'
          ? {
              count: data.random_character_count || 5,
              from_library: data.random_character_source || 'baytt'
            }
          : undefined
      }
      
      const response = await fetch('/api/movies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          character_selection: characterSelection
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al crear película')
      }
      
      return result
    },
    onSuccess: (data) => {
      toast({
        title: '🎬 Película en creación',
        description: 'Se ha iniciado el proceso de generación',
        variant: 'success'
      })
      
      // Redirigir a la página de progreso
      router.push(`/admin/movies/${data.movie.id}/progress`)
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error'
      })
    }
  })
  
  const onSubmit = (data: CreateMovieForm) => {
    console.log('[MOVIE FORM] onSubmit called with data:', data)
    console.log('[MOVIE FORM] Form errors:', form.formState.errors)
    console.log('[MOVIE FORM] Providers status:', providersStatus)
    
    // Verificar proveedores primero
    if (!providersStatus?.can_create_movie) {
      console.warn('[MOVIE FORM] Cannot create movie - missing providers')
      toast({
        title: 'Proveedores faltantes',
        description: `Configura los proveedores requeridos: ${providersStatus?.missing_required?.join(', ') || 'desconocidos'}`,
        variant: 'error'
      })
      return
    }
    
    console.log('[MOVIE FORM] Starting mutation...')
    createMutation.mutate(data)
  }
  
  // Si están cargando los proveedores
  if (loadingProviders) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  return (
    <div className="container-app py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Film className="h-8 w-8 text-primary" />
            Crear Nueva Película
          </h1>
          <p className="text-foreground-muted mt-2">
            Describe tu idea, elige los personajes y la IA generará la película completa
          </p>
        </div>
        
        {/* Estado de proveedores */}
        <Card className={`mb-6 ${providersStatus?.can_create_movie ? 'border-success' : 'border-error'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Estado de Proveedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {providersStatus?.providers.map((provider: any) => (
                <div 
                  key={provider.type}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    provider.is_configured 
                      ? 'bg-success/10 text-success' 
                      : provider.is_required 
                        ? 'bg-error/10 text-error'
                        : 'bg-background-secondary text-foreground-muted'
                  }`}
                >
                  {provider.is_configured ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : provider.is_required ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">{provider.type_label}</span>
                </div>
              ))}
            </div>
            
            {!providersStatus?.can_create_movie && (
              <div className="mt-4 p-3 bg-error/10 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-error mt-0.5" />
                <div>
                  <p className="font-medium text-error">Proveedores requeridos faltantes</p>
                  <p className="text-sm text-foreground-muted">
                    Configura: {providersStatus?.missing_required.join(', ')}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => router.push('/admin/providers')}
                  >
                    Configurar Proveedores
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              step === 'info' ? 'bg-primary text-primary-foreground' : 'bg-background-secondary'
            }`}>
              <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm">1</span>
              <span>Información</span>
            </div>
            <ChevronRight className="h-4 w-4 text-foreground-muted" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              step === 'characters' ? 'bg-primary text-primary-foreground' : 'bg-background-secondary'
            }`}>
              <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm">2</span>
              <span>Personajes</span>
            </div>
            <ChevronRight className="h-4 w-4 text-foreground-muted" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              step === 'review' ? 'bg-primary text-primary-foreground' : 'bg-background-secondary'
            }`}>
              <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm">3</span>
              <span>Revisar</span>
            </div>
          </div>
        </div>
        
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Información básica */}
          {step === 'info' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la Película</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InputWrapper
                    label="Título *"
                    placeholder="Ej: El Detective de Benidorm"
                    {...form.register('title')}
                    error={form.formState.errors.title?.message}
                  />
                  
                  <TextareaWrapper
                    label="Prompt / Idea de la Película *"
                    placeholder="Describe tu idea en detalle: género, ubicación, personajes principales, trama, tono..."
                    {...form.register('prompt')}
                    error={form.formState.errors.prompt?.message}
                    rows={6}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <SelectWrapper
                      label="Género"
                      value={form.watch('genre')}
                      onChange={(v) => form.setValue('genre', v)}
                      options={GENRES.map(g => ({ value: g.id, label: `${g.icon} ${g.name}` }))}
                    />
                    
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Duración (minutos)
                        <span className="text-xs text-foreground-muted ml-2">
                          ({minDuration} - {maxDuration} min)
                        </span>
                      </Label>
                      <InputWrapper
                        type="number"
                        min={minDuration}
                        max={maxDuration}
                        {...form.register('target_duration_minutes', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <SelectWrapper
                      label="Estilo Visual"
                      value={form.watch('style')}
                      onChange={(v) => form.setValue('style', v)}
                      options={[
                        { value: 'cinematic', label: 'Cinematográfico' },
                        { value: 'realistic', label: 'Realista' },
                        { value: 'artistic', label: 'Artístico' },
                        { value: 'noir', label: 'Noir' },
                      ]}
                    />
                    
                    <SelectWrapper
                      label="Tono"
                      value={form.watch('tone')}
                      onChange={(v) => form.setValue('tone', v)}
                      options={[
                        { value: 'neutral', label: 'Neutral' },
                        { value: 'dark', label: 'Oscuro' },
                        { value: 'light', label: 'Ligero' },
                        { value: 'intense', label: 'Intenso' },
                      ]}
                    />
                    
                    <SelectWrapper
                      label="Clasificación"
                      value={form.watch('age_rating')}
                      onChange={(v) => form.setValue('age_rating', v)}
                      options={[
                        { value: 'G', label: 'G' },
                        { value: 'PG', label: 'PG' },
                        { value: 'PG-13', label: 'PG-13' },
                        { value: 'R', label: 'R' },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep('characters')}>
                  Siguiente: Personajes
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 2: Selección de personajes */}
          {step === 'characters' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Selección de Personajes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Modo de selección */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => form.setValue('character_mode', 'random')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        characterMode === 'random'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Shuffle className="h-8 w-8 mb-2 text-primary" />
                      <p className="font-semibold">Aleatorio</p>
                      <p className="text-sm text-foreground-muted">
                        La IA elige personajes apropiados para la historia
                      </p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => form.setValue('character_mode', 'select')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        characterMode === 'select'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Library className="h-8 w-8 mb-2 text-primary" />
                      <p className="font-semibold">Elegir</p>
                      <p className="text-sm text-foreground-muted">
                        Selecciona personajes específicos de la biblioteca
                      </p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => form.setValue('character_mode', 'mixed')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        characterMode === 'mixed'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <UserCircle className="h-8 w-8 mb-2 text-primary" />
                      <p className="font-semibold">Mixto</p>
                      <p className="text-sm text-foreground-muted">
                        Elige algunos y deja que la IA complete el resto
                      </p>
                    </button>
                  </div>
                  
                  {/* Opciones según el modo */}
                  {(characterMode === 'random' || characterMode === 'mixed') && (
                    <div className="p-4 bg-background-secondary rounded-xl mb-6">
                      <h4 className="font-medium mb-3">Configuración de Personajes Aleatorios</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Cantidad de personajes
                          </Label>
                          <InputWrapper
                            type="number"
                            min={1}
                            max={20}
                            {...form.register('random_character_count', { valueAsNumber: true })}
                          />
                        </div>
                        
                        <SelectWrapper
                          label="Origen"
                          value={form.watch('random_character_source') || 'baytt'}
                          onChange={(v) => form.setValue('random_character_source', v as any)}
                          options={[
                            { value: 'baytt', label: 'Biblioteca BAYTT' },
                            { value: 'user', label: 'Mis Personajes' },
                            { value: 'both', label: 'Ambos' },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Selector de personajes para modo 'select' o 'mixed' */}
                  {(characterMode === 'select' || characterMode === 'mixed') && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Personajes Seleccionados</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCharacterPicker(true)}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Añadir Personajes
                        </Button>
                      </div>
                      
                      {selectedCharacters.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-xl">
                          <Users className="h-12 w-12 mx-auto text-foreground-muted mb-2" />
                          <p className="text-foreground-muted">
                            No hay personajes seleccionados
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => setShowCharacterPicker(true)}
                          >
                            Seleccionar personajes
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {selectedCharacters.map((char) => (
                            <div
                              key={char.id}
                              className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg"
                            >
                              <img
                                src={char.thumbnail_url || char.reference_images?.[0] || '/placeholder-avatar.jpg'}
                                alt={char.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{char.name}</p>
                                <SelectWrapper
                                  value={char.selected_role || 'supporting'}
                                  onChange={(v) => {
                                    setSelectedCharacters(prev =>
                                      prev.map(c =>
                                        c.id === char.id
                                          ? { ...c, selected_role: v }
                                          : c
                                      )
                                    )
                                  }}
                                  options={[
                                    { value: 'protagonist', label: 'Protagonista' },
                                    { value: 'antagonist', label: 'Antagonista' },
                                    { value: 'supporting', label: 'Secundario' },
                                  ]}
                                  className="text-xs"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCharacters(prev =>
                                    prev.filter(c => c.id !== char.id)
                                  )
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep('info')}>
                  Anterior
                </Button>
                <Button type="button" onClick={() => setStep('review')}>
                  Siguiente: Revisar
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: Revisar y crear */}
          {step === 'review' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de la Película</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-foreground-muted">Título</p>
                      <p className="font-semibold">{form.watch('title') || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground-muted">Género</p>
                      <p className="font-semibold capitalize">{form.watch('genre')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground-muted">Duración</p>
                      <p className="font-semibold">{form.watch('target_duration_minutes')} minutos</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground-muted">Personajes</p>
                      <p className="font-semibold">
                        {characterMode === 'random' && `${form.watch('random_character_count')} aleatorios`}
                        {characterMode === 'select' && `${selectedCharacters.length} seleccionados`}
                        {characterMode === 'mixed' && `${selectedCharacters.length} + aleatorios`}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-foreground-muted mb-1">Prompt</p>
                    <p className="p-3 bg-background-secondary rounded-lg text-sm">
                      {form.watch('prompt') || '-'}
                    </p>
                  </div>
                  
                  {/* Estimación */}
                  <div className="p-4 bg-primary/10 rounded-xl">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      Estimación
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-foreground-muted">Tiempo estimado</p>
                        <p className="font-semibold">~{Math.round(form.watch('target_duration_minutes') * 3)} minutos</p>
                      </div>
                      <div>
                        <p className="text-foreground-muted">Coste estimado</p>
                        <p className="font-semibold">~${((form.watch('target_duration_minutes') / 60) * 205).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Warning si no hay proveedores */}
              {!providersStatus?.can_create_movie && (
                <Card className="border-error">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-error mt-0.5" />
                      <div>
                        <p className="font-medium text-error">No se puede crear la película</p>
                        <p className="text-sm text-foreground-muted">
                          Faltan proveedores requeridos: {providersStatus?.missing_required?.join(', ') || 'desconocidos'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => router.push('/admin/providers')}
                        >
                          Configurar Proveedores
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Warning si hay errores de validación */}
              {Object.keys(form.formState.errors).length > 0 && (
                <Card className="border-warning">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-warning">Hay errores en el formulario</p>
                        <p className="text-sm text-foreground-muted">
                          Por favor, corrige los siguientes campos: {Object.keys(form.formState.errors).join(', ')}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setStep('info')}
                        >
                          Volver a Información
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep('characters')}>
                  Anterior
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || !providersStatus?.can_create_movie}
                  size="lg"
                  title={
                    createMutation.isPending 
                      ? 'Creando película...' 
                      : !providersStatus?.can_create_movie 
                        ? `Faltan proveedores: ${providersStatus?.missing_required?.join(', ') || 'desconocidos'}`
                        : 'Crear película'
                  }
                  onClick={async (e) => {
                    console.log('[MOVIE FORM] Submit button clicked')
                    console.log('[MOVIE FORM] Form state:', {
                      isValid: form.formState.isValid,
                      errors: form.formState.errors,
                      values: form.getValues(),
                      canCreate: providersStatus?.can_create_movie,
                      isPending: createMutation.isPending
                    })
                    
                    // Ejecutar validación manualmente para obtener errores actualizados
                    const isValid = await form.trigger()
                    console.log('[MOVIE FORM] Form is valid after trigger:', isValid)
                    console.log('[MOVIE FORM] Form errors after trigger:', form.formState.errors)
                    
                    if (!isValid) {
                      console.error('[MOVIE FORM] Form validation failed:', form.formState.errors)
                      toast({
                        title: 'Formulario inválido',
                        description: Object.entries(form.formState.errors)
                          .map(([key, error]: any) => `${key}: ${error?.message || 'error'}`)
                          .join(', ') || 'Por favor, corrige los errores en el formulario antes de continuar',
                        variant: 'error'
                      })
                      e.preventDefault() // Prevenir el submit si no es válido
                      return
                    }
                    
                    if (!providersStatus?.can_create_movie) {
                      console.error('[MOVIE FORM] Cannot create - providers not ready:', providersStatus?.missing_required)
                      toast({
                        title: 'Proveedores faltantes',
                        description: `Configura los proveedores requeridos: ${providersStatus?.missing_required?.join(', ') || 'desconocidos'}`,
                        variant: 'error'
                      })
                      e.preventDefault()
                      return
                    }
                    
                    // Si todo está bien, permitir que el form maneje el submit normalmente
                    console.log('[MOVIE FORM] All validations passed, submitting form...')
                  }}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Crear Película
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
        
        {/* Character Picker Dialog */}
        <CharacterPickerDialog
          open={showCharacterPicker}
          onClose={() => setShowCharacterPicker(false)}
          characters={charactersData?.data?.data || charactersData?.data || []}
          selectedIds={selectedCharacters.map(c => c.id)}
          onSelect={(char) => {
            if (selectedCharacters.find(c => c.id === char.id)) {
              setSelectedCharacters(prev => prev.filter(c => c.id !== char.id))
            } else {
              setSelectedCharacters(prev => [...prev, { ...char, selected_role: 'supporting' }])
            }
          }}
        />
      </div>
    </div>
  )
}

// Dialog para seleccionar personajes
function CharacterPickerDialog({
  open,
  onClose,
  characters,
  selectedIds,
  onSelect
}: {
  open: boolean
  onClose: () => void
  characters: any[]
  selectedIds: string[]
  onSelect: (char: any) => void
}) {
  const [tab, setTab] = useState<'baytt' | 'user'>('baytt')
  const [search, setSearch] = useState('')
  
  const filteredCharacters = characters.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase())
    const matchesTab = tab === 'baytt' ? c.is_baytt_character : !c.is_baytt_character
    return matchesSearch && matchesTab
  })
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Personajes</DialogTitle>
        </DialogHeader>
        
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="baytt">
              <Library className="mr-2 h-4 w-4" />
              Biblioteca BAYTT
            </TabsTrigger>
            <TabsTrigger value="user">
              <UserCircle className="mr-2 h-4 w-4" />
              Mis Personajes
            </TabsTrigger>
          </TabsList>
          
          <InputWrapper
            placeholder="Buscar personajes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
          
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {filteredCharacters.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => onSelect(char)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedIds.includes(char.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={char.thumbnail_url || char.reference_images?.[0] || '/placeholder-avatar.jpg'}
                      alt={char.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{char.name}</p>
                      <p className="text-xs text-foreground-muted truncate">
                        {char.category} • {char.gender}
                      </p>
                    </div>
                    {selectedIds.includes(char.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {filteredCharacters.length === 0 && (
              <div className="text-center py-8 text-foreground-muted">
                No se encontraron personajes
              </div>
            )}
          </div>
        </Tabs>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-foreground-muted">
            {selectedIds.length} personajes seleccionados
          </p>
          <Button onClick={onClose}>
            Confirmar Selección
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

