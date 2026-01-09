"use client"

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { 
  Film, Loader2, CheckCircle2, XCircle, Clock,
  MapPin, FileText, Users, Video, Mic, Music,
  Layers, Image, Flag, AlertCircle, TrendingUp,
  Zap, Timer, PlayCircle, ArrowLeft
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDuration, formatDate } from '@/lib/utils/formatters'

const STEP_CONFIG: Record<string, { icon: any; label: string }> = {
  validate_providers: { icon: CheckCircle2, label: 'Validar Proveedores' },
  research_locations: { icon: MapPin, label: 'Investigar Ubicaciones' },
  generate_screenplay: { icon: FileText, label: 'Generar Guión' },
  assign_characters: { icon: Users, label: 'Asignar Personajes' },
  generate_videos: { icon: Video, label: 'Generar Videos' },
  generate_audio: { icon: Mic, label: 'Generar Audio' },
  apply_lip_sync: { icon: Mic, label: 'Sincronizar Labios' },
  generate_music: { icon: Music, label: 'Generar Música' },
  assemble_movie: { icon: Layers, label: 'Ensamblar Película' },
  generate_cover: { icon: Image, label: 'Generar Portada' },
  finalize: { icon: Flag, label: 'Finalizar' },
}

export default function MovieProgressPage() {
  const params = useParams()
  const router = useRouter()
  const movieId = (params?.id || params?.movieId) as string
  
  if (!movieId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-error mb-4" />
        <p className="text-lg">ID de película no válido</p>
        <Button onClick={() => router.push('/admin/movies')} className="mt-4">
          Volver al listado
        </Button>
      </div>
    )
  }
  
  // Polling del progreso cada 3 segundos
  const { data, isLoading, error } = useQuery({
    queryKey: ['movie-progress', movieId],
    queryFn: async () => {
      const res = await fetch(`/api/movies/${movieId}/progress`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`)
      }
      return res.json()
    },
    refetchInterval: 3000,  // Actualizar cada 3 segundos
    refetchIntervalInBackground: true,
    retry: 2, // Reintentar 2 veces antes de mostrar error
    retryDelay: 1000
  })
  
  const progress = data?.progress
  const movie = data?.movie
  
  // Calcular tiempo restante estimado
  const estimatedTimeRemaining = useMemo(() => {
    if (!progress?.stats) return null
    
    const elapsed = progress.stats.elapsed_time || 0
    const completed = progress.overall_progress || 0
    
    if (completed === 0 || completed === 100) return null
    
    // Calcular velocidad de progreso (porcentaje por segundo)
    const progressPerSecond = completed / elapsed
    
    if (progressPerSecond <= 0) return null
    
    // Calcular tiempo restante
    const remaining = (100 - completed) / progressPerSecond
    
    return Math.max(0, Math.round(remaining))
  }, [progress])
  
  // Calcular velocidad de progreso
  const progressSpeed = useMemo(() => {
    if (!progress?.stats) return null
    
    const elapsed = progress.stats.elapsed_time || 0
    const completed = progress.overall_progress || 0
    
    if (elapsed === 0) return null
    
    return (completed / elapsed) * 60 // Porcentaje por minuto
  }, [progress])
  
  // Si está completado, redirigir después de 3 segundos
  useEffect(() => {
    if (movie?.status === 'completed') {
      const timer = setTimeout(() => {
        router.push(`/admin/movies/${movieId}`)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [movie?.status, movieId, router])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (error || !movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-error mb-4" />
        <p className="text-lg">Error al cargar el progreso</p>
        <Button onClick={() => router.push('/admin/movies')} className="mt-4">
          Volver al listado
        </Button>
      </div>
    )
  }
  
  return (
    <div className="container-app py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header con botón volver */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/movies/${movieId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la película
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Film className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">{movie.title}</h1>
                <p className="text-foreground-muted">
                  {movie.description || 'Sin descripción'}
                </p>
              </div>
            </div>
            
            {movie.status === 'completed' ? (
              <Badge variant="success" className="text-lg px-4 py-2">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Completado
              </Badge>
            ) : movie.status === 'failed' ? (
              <Badge variant="error" className="text-lg px-4 py-2">
                <XCircle className="mr-2 h-5 w-5" />
                Error en la generación
              </Badge>
            ) : (
              <Badge variant="warning" className="text-lg px-4 py-2">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generando...
              </Badge>
            )}
          </div>
        </div>
        
        {/* Progreso general mejorado */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Progreso General</h2>
                {progress?.current_step_detail && (
                  <p className="text-sm text-foreground-muted">
                    {progress.current_step_detail}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">
                  {progress?.overall_progress || movie.progress || 0}%
                </div>
                {progressSpeed && (
                  <div className="text-xs text-foreground-muted flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    {progressSpeed.toFixed(1)}%/min
                  </div>
                )}
              </div>
            </div>
            
            <Progress 
              value={progress?.overall_progress || movie.progress || 0} 
              className="h-6 mb-4"
            />
            
            {/* Estadísticas de tiempo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">Tiempo transcurrido</p>
                  <p className="font-semibold">
                    {formatTime(progress?.stats?.elapsed_time || 0)}
                  </p>
                </div>
              </div>
              
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                  <div className="p-2 bg-warning/10 rounded-full">
                    <Timer className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">Tiempo restante</p>
                    <p className="font-semibold">
                      ~{formatTime(estimatedTimeRemaining)}
                    </p>
                  </div>
                </div>
              )}
              
              {progress?.stats && (
                <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                  <div className="p-2 bg-success/10 rounded-full">
                    <Zap className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">Escenas</p>
                    <p className="font-semibold">
                      {progress.stats.scenes_completed || 0} / {progress.stats.total_scenes || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Pasos mejorados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Pasos del Proceso de Generación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(STEP_CONFIG).map(([key, config], index) => {
                const stepData = progress?.steps?.[key]
                const Icon = config.icon
                const isActive = stepData?.status === 'running'
                const isCompleted = stepData?.status === 'completed'
                const isFailed = stepData?.status === 'failed'
                const isPending = !stepData || stepData.status === 'pending'
                
                return (
                  <div
                    key={key}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      isCompleted
                        ? 'bg-success/10 border-success/30'
                        : isActive
                        ? 'bg-primary/10 border-primary/50 shadow-glow'
                        : isFailed
                        ? 'bg-error/10 border-error/30'
                        : 'bg-background-secondary border-border'
                    }`}
                  >
                    {/* Línea conectora */}
                    {index < Object.keys(STEP_CONFIG).length - 1 && (
                      <div className={`absolute left-6 top-16 w-0.5 h-8 ${
                        isCompleted ? 'bg-success' : 'bg-border'
                      }`} />
                    )}
                    
                    {/* Icono de estado */}
                    <div className={`relative p-3 rounded-full transition-all ${
                      isCompleted
                        ? 'bg-success text-success-foreground'
                        : isActive
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : isFailed
                        ? 'bg-error text-error-foreground'
                        : 'bg-background-tertiary text-foreground-muted'
                    }`}>
                      {isActive ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : isFailed ? (
                        <XCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    
                    {/* Información del paso */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-semibold ${
                          isActive ? 'text-primary' : isCompleted ? 'text-success' : ''
                        }`}>
                          {config.label}
                        </p>
                        <span className={`text-sm font-bold ${
                          isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-foreground-muted'
                        }`}>
                          {stepData?.progress || 0}%
                        </span>
                      </div>
                      
                      {stepData?.details && (
                        <p className="text-sm text-foreground-muted truncate">
                          {stepData.details}
                        </p>
                      )}
                      
                      {isActive && stepData?.progress !== undefined && stepData.progress < 100 && (
                        <Progress 
                          value={stepData.progress} 
                          className="h-1.5 mt-2"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Errores */}
        {progress?.errors && progress.errors.length > 0 && (
          <Card className="mt-6 border-error">
            <CardHeader>
              <CardTitle className="text-error">Errores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {progress.errors.map((error: any, i: number) => (
                  <div key={i} className="p-3 bg-error/10 rounded-lg">
                    <p className="font-medium">{error.step}</p>
                    <p className="text-sm">{error.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Información adicional */}
        {movie.created_at && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-foreground-muted mb-1">Iniciado</p>
                  <p className="font-medium">{formatDate(movie.created_at)}</p>
                </div>
                {movie.duration_minutes && (
                  <div>
                    <p className="text-foreground-muted mb-1">Duración objetivo</p>
                    <p className="font-medium">{formatDuration(movie.duration_minutes)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Acciones */}
        <div className="flex justify-center gap-4 mt-8">
          {movie.status === 'completed' && (
            <>
              <Button 
                variant="outline"
                onClick={() => router.push('/admin/movies')}
              >
                Volver al listado
              </Button>
              <Button onClick={() => router.push(`/admin/movies/${movieId}`)}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Ver Película Completa
              </Button>
            </>
          )}
          
          {movie.status === 'failed' && (
            <>
              <Button variant="outline" onClick={() => router.push('/admin/movies')}>
                Volver al listado
              </Button>
              <Button variant="outline" onClick={() => router.push(`/admin/movies/${movieId}`)}>
                Ver Detalles
              </Button>
            </>
          )}
          
          {(movie.status !== 'completed' && movie.status !== 'failed') && (
            <Button variant="outline" onClick={() => router.push(`/admin/movies/${movieId}`)}>
              Ver Detalles de la Película
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

