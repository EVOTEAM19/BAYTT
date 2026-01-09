"use client"

import { useState } from 'react'
import { Search, MapPin, Image, Palette, Check, Loader2, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SelectWrapper } from '@/components/ui/select-wrapper'
import { VisualBible } from '@/types/visual-research'
import { useToast } from '@/hooks/use-toast'

interface LocationResearchPreviewProps {
  onBibleGenerated?: (bible: VisualBible) => void
}

export function LocationResearchPreview({ onBibleGenerated }: LocationResearchPreviewProps) {
  const { toast } = useToast()
  const [location, setLocation] = useState('')
  const [locationType, setLocationType] = useState<'city' | 'nature' | 'interior' | 'fictional' | 'historical'>('city')
  const [isResearching, setIsResearching] = useState(false)
  const [progress, setProgress] = useState('')
  const [bible, setBible] = useState<VisualBible | null>(null)

  const startResearch = async () => {
    if (!location.trim()) {
      toast({
        title: 'Ubicación requerida',
        description: 'Introduce el nombre de la ubicación',
        variant: 'error'
      })
      return
    }
    
    setIsResearching(true)
    setProgress('Buscando imágenes de referencia...')
    
    try {
      const response = await fetch('/api/research/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_name: location,
          location_type: locationType
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al investigar ubicación')
      }
      
      if (data.success) {
        setBible(data.bible)
        if (onBibleGenerated) {
          onBibleGenerated(data.bible)
        }
        toast({
          title: '✅ Biblia Visual generada',
          description: `Investigación completada para ${location}`,
          variant: 'success'
        })
      }
      
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: 'Error al investigar',
        description: error.message || 'No se pudo generar la biblia visual',
        variant: 'error'
      })
    } finally {
      setIsResearching(false)
      setProgress('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Investigación Visual de Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Ej: Benidorm, España"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isResearching}
                className="flex-1"
              />
              <div className="w-48">
                <SelectWrapper
                  value={locationType}
                  onChange={(v) => setLocationType(v as any)}
                  disabled={isResearching}
                  options={[
                    { value: 'city', label: 'Ciudad' },
                    { value: 'nature', label: 'Naturaleza' },
                    { value: 'interior', label: 'Interior' },
                    { value: 'fictional', label: 'Ficción' },
                    { value: 'historical', label: 'Histórica' }
                  ]}
                />
              </div>
              <Button 
                onClick={startResearch} 
                disabled={isResearching || !location.trim()}
                size="lg"
              >
                {isResearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Investigando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Investigar
                  </>
                )}
              </Button>
            </div>
            
            {progress && (
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{progress}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Resultado */}
      {bible && (
        <div className="space-y-6">
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle>📖 Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium mb-2">{bible.summary.one_line}</p>
              <p className="text-foreground-muted whitespace-pre-wrap">{bible.summary.description}</p>
              
              {bible.summary.unique_characteristics.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Características únicas:</p>
                  <div className="flex flex-wrap gap-2">
                    {bible.summary.unique_characteristics.map((char, i) => (
                      <Badge key={i} variant="secondary">{char}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Imágenes de referencia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Imágenes de Referencia ({bible.reference_images.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {bible.reference_images.slice(0, 9).map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={img.url}
                        alt={img.description}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Badge variant="secondary" className="text-xs">
                          {img.source}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {bible.reference_images.length > 9 && (
                  <p className="text-xs text-foreground-muted mt-2 text-center">
                    +{bible.reference_images.length - 9} imágenes más
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Paleta de colores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Paleta de Colores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Colores Primarios</p>
                    <div className="flex gap-2 flex-wrap">
                      {bible.color_palette.primary.map((color, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-12 h-12 rounded-lg border-2 border-border"
                            style={{ backgroundColor: color.hex }}
                            title={`${color.name}: ${color.usage}`}
                          />
                          <span className="text-xs text-foreground-muted">{color.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {bible.color_palette.secondary.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Colores Secundarios</p>
                      <div className="flex gap-2 flex-wrap">
                        {bible.color_palette.secondary.map((color, i) => (
                          <div
                            key={i}
                            className="flex flex-col items-center gap-1"
                          >
                            <div
                              className="w-10 h-10 rounded-lg border-2 border-border"
                              style={{ backgroundColor: color.hex }}
                              title={`${color.name}: ${color.usage}`}
                            />
                            <span className="text-xs text-foreground-muted">{color.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Elementos obligatorios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
                  Elementos Obligatorios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Siempre presentes:</p>
                    <div className="flex flex-wrap gap-2">
                      {bible.mandatory_elements.always_present.map((el, i) => (
                        <Badge key={i} variant="success">
                          <Check className="h-3 w-3 mr-1" />
                          {el}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {bible.mandatory_elements.iconic_landmarks.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Lugares icónicos:</p>
                      <div className="space-y-2">
                        {bible.mandatory_elements.iconic_landmarks.map((landmark, i) => (
                          <div key={i} className="p-2 bg-background-secondary rounded">
                            <p className="font-medium text-sm">{landmark.name}</p>
                            <p className="text-xs text-foreground-muted">{landmark.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Elementos prohibidos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <X className="h-5 w-5 text-error" />
                  Elementos Prohibidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Nunca incluir:</p>
                    <div className="flex flex-wrap gap-2">
                      {bible.forbidden_elements.never_include.map((el, i) => (
                        <Badge key={i} variant="error">
                          {el}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {bible.forbidden_elements.common_mistakes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Errores comunes:</p>
                      <div className="flex flex-wrap gap-2">
                        {bible.forbidden_elements.common_mistakes.map((mistake, i) => (
                          <Badge key={i} variant="warning">
                            {mistake}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Iluminación */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Iluminación Típica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Día</p>
                  <p className="text-xs text-foreground-muted">{bible.typical_lighting.daytime.description}</p>
                  <p className="text-xs text-foreground-muted mt-1">{bible.typical_lighting.daytime.color_temperature}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Atardecer</p>
                  <p className="text-xs text-foreground-muted">{bible.typical_lighting.sunset.description}</p>
                  <p className="text-xs text-foreground-muted mt-1">{bible.typical_lighting.sunset.color_temperature}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Noche</p>
                  <p className="text-xs text-foreground-muted">{bible.typical_lighting.night.description}</p>
                  {bible.typical_lighting.night.artificial_lights.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bible.typical_lighting.night.artificial_lights.map((light, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{light}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Arquitectura y Vegetación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🏗️ Arquitectura</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium mb-2">Estilo: {bible.architecture.style}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-foreground-muted">Tipos de edificios:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bible.architecture.building_types.map((type, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground-muted">Materiales:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bible.architecture.materials.map((mat, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{mat}</Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted mt-2">Alturas: {bible.architecture.heights}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>🌳 Vegetación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-foreground-muted">Tipos:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bible.vegetation.types.map((type, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted">Densidad: {bible.vegetation.density}</p>
                  <p className="text-xs text-foreground-muted">Cambios estacionales: {bible.vegetation.seasonal_changes}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

