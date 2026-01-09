"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Save, Loader2, Eye, EyeOff, TestTube, CheckCircle2, 
  XCircle, Info, ChevronDown 
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InputWrapper } from '@/components/ui/input-wrapper'
import { Input } from '@/components/ui/input'
import { SelectWrapper } from '@/components/ui/select-wrapper'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { PROVIDER_VERSIONS } from '@/types/provider'

// Schema de validación
const providerSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  provider_type: z.string(),
  api_endpoint: z.string().url('URL válida requerida'),
  api_key: z.string().optional(),
  api_version: z.string().optional(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  config: z.record(z.string(), z.any()).optional()
})

type ProviderFormData = z.infer<typeof providerSchema>

interface ProviderFormProps {
  provider?: any
  onSuccess?: () => void
  onCancel?: () => void
}

// Detectar qué proveedor es basado en el nombre o endpoint
function detectProviderKey(name: string, endpoint: string): string | null {
  const lowerName = name.toLowerCase()
  const lowerEndpoint = endpoint.toLowerCase()
  
  if (lowerName.includes('runway') || lowerEndpoint.includes('runway')) return 'runway'
  if (lowerName.includes('openai') || lowerEndpoint.includes('openai')) return 'openai'
  if (lowerName.includes('elevenlabs') || lowerEndpoint.includes('elevenlabs')) return 'elevenlabs'
  if (lowerName.includes('fal') && (lowerName.includes('lora') || lowerEndpoint.includes('lora'))) return 'fal-lora'
  if (lowerName.includes('fal') || lowerEndpoint.includes('fal.run')) return 'fal-image'
  if (lowerName.includes('sync') || lowerEndpoint.includes('sync')) return 'synclabs'
  if (lowerName.includes('beatoven') || lowerEndpoint.includes('beatoven')) return 'beatoven'
  
  return null
}

export function ProviderForm({ provider, onSuccess, onCancel }: ProviderFormProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showApiKey, setShowApiKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [availableVersions, setAvailableVersions] = useState<string[]>([])
  const [versionDescriptions, setVersionDescriptions] = useState<Record<string, string>>({})
  
  const isEditing = !!provider
  
  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: provider?.name || '',
      provider_type: provider?.provider_type || provider?.type || 'llm', // Soporta ambos campos
      api_endpoint: provider?.api_endpoint || provider?.api_url || '', // Soporta ambos campos
      api_key: '',  // No mostrar la key existente
      api_version: provider?.api_version || provider?.config?.api_version || '', // Soporta ambos campos
      is_active: provider?.is_active ?? true,
      is_default: provider?.is_default ?? false,
      config: provider?.config || {}
    }
  })
  
  const watchName = form.watch('name')
  const watchEndpoint = form.watch('api_endpoint')
  const watchVersion = form.watch('api_version')
  
  // Detectar versiones disponibles cuando cambia el nombre o endpoint
  useEffect(() => {
    const providerKey = detectProviderKey(watchName || '', watchEndpoint || '')
    
    if (providerKey && PROVIDER_VERSIONS[providerKey]) {
      const config = PROVIDER_VERSIONS[providerKey]
      setAvailableVersions(config.versions)
      setVersionDescriptions(config.description)
      
      // Si no hay versión seleccionada, usar la default
      if (!form.getValues('api_version')) {
        form.setValue('api_version', config.default)
      }
    } else {
      setAvailableVersions([])
      setVersionDescriptions({})
    }
  }, [watchName, watchEndpoint])
  
  // Mutation para guardar
  const saveMutation = useMutation({
    mutationFn: async (data: ProviderFormData) => {
      // Adaptar los datos al formato esperado por el backend
      const payload: any = {
        type: data.provider_type,
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        api_url: data.api_endpoint,
        api_key: data.api_key || undefined,
        api_version: data.api_version || undefined,
        auth_method: 'bearer', // Default, se puede extender
        is_active: data.is_active,
        is_default: data.is_default,
        config: data.config || {}
      }
      
      const url = isEditing 
        ? `/api/providers/${provider.id}` 
        : '/api/providers'
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      toast({
        title: isEditing ? 'Proveedor actualizado' : 'Proveedor creado',
        variant: 'success'
      })
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error'
      })
    }
  })
  
  // Test de conexión
  const testConnection = async () => {
    setTestStatus('testing')
    
    try {
      const response = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.getValues('provider_type'),
          api_url: form.getValues('api_endpoint'),
          api_key: form.getValues('api_key') || provider?.api_key_encrypted,
          api_version: form.getValues('api_version'),
          auth_method: 'bearer'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setTestStatus('success')
        toast({
          title: '✅ Conexión exitosa',
          description: result.message || 'El proveedor responde correctamente',
          variant: 'success'
        })
      } else {
        setTestStatus('error')
        toast({
          title: '❌ Error de conexión',
          description: result.error || 'No se pudo conectar con el proveedor',
          variant: 'error'
        })
      }
    } catch (error) {
      setTestStatus('error')
      toast({
        title: '❌ Error',
        description: 'No se pudo realizar la prueba',
        variant: 'error'
      })
    }
    
    // Reset status después de 3 segundos
    setTimeout(() => setTestStatus('idle'), 3000)
  }
  
  const onSubmit = (data: ProviderFormData) => {
    saveMutation.mutate(data)
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? `Editar ${provider.name}` : 'Nuevo Proveedor'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Nombre */}
          <InputWrapper
            label="Nombre del Proveedor"
            placeholder="Ej: OpenAI GPT-4, Runway Gen-3, etc."
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          
          {/* Tipo */}
          <SelectWrapper
            label="Tipo de Proveedor"
            value={form.watch('provider_type')}
            onChange={(v) => form.setValue('provider_type', v)}
            options={[
              { value: 'llm', label: '🧠 LLM (Guionista)' },
              { value: 'video', label: '🎬 Generador de Video' },
              { value: 'audio', label: '🎙️ Generador de Voz' },
              { value: 'image', label: '🖼️ Generador de Imágenes' },
              { value: 'lip_sync', label: '👄 Sincronización de Labios' },
              { value: 'music', label: '🎵 Generador de Música' },
              { value: 'lora_training', label: '🎭 Entrenamiento LoRA' },
              { value: 'storage', label: '📦 Almacenamiento' },
            ]}
          />
          
          {/* Endpoint */}
          <InputWrapper
            label="API Endpoint"
            placeholder="https://api.ejemplo.com/v1"
            {...form.register('api_endpoint')}
            error={form.formState.errors.api_endpoint?.message}
          />
          
          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={isEditing ? '••••••••••••••••' : 'Introduce tu API key'}
                  {...form.register('api_key')}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={testConnection}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testStatus === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : testStatus === 'error' ? (
                  <XCircle className="h-4 w-4 text-error" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                <span className="ml-2">Probar</span>
              </Button>
            </div>
            {isEditing && (
              <p className="text-xs text-foreground-muted">
                Deja en blanco para mantener la API key actual
              </p>
            )}
          </div>
          
          {/* ⭐ SELECTOR DE VERSIÓN DE API */}
          {availableVersions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Versión de API</label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-foreground-muted cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Selecciona la versión de la API que quieres usar. Las versiones más recientes suelen tener mejor calidad pero pueden ser más caras.
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <SelectWrapper
                value={watchVersion || ''}
                onChange={(v) => form.setValue('api_version', v)}
                options={availableVersions.map(version => ({
                  value: version,
                  label: `${version}${versionDescriptions[version] ? ` - ${versionDescriptions[version]}` : ''}`
                }))}
                placeholder="Selecciona una versión"
              />
              
              {/* Descripción de la versión seleccionada */}
              {watchVersion && versionDescriptions[watchVersion] && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-sm">{versionDescriptions[watchVersion]}</span>
                </div>
              )}
              
              {/* Mostrar todas las versiones disponibles */}
              <div className="mt-2">
                <p className="text-xs text-foreground-muted mb-2">Versiones disponibles:</p>
                <div className="flex flex-wrap gap-2">
                  {availableVersions.map(version => (
                    <Badge
                      key={version}
                      variant={version === watchVersion ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => form.setValue('api_version', version)}
                    >
                      {version}
                      {version === watchVersion && ' ✓'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Switches */}
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium">Activo</p>
              <p className="text-sm text-foreground-muted">
                Habilitar este proveedor para su uso
              </p>
            </div>
            <Switch
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium">Por defecto</p>
              <p className="text-sm text-foreground-muted">
                Usar como proveedor principal para su tipo
              </p>
            </div>
            <Switch
              checked={form.watch('is_default')}
              onCheckedChange={(checked) => form.setValue('is_default', checked)}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
