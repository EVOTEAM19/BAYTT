# Guía de Integración - Sistema V2

## Cambios Implementados

### 1. Nuevas Tablas de Base de Datos
- ✅ `locations` - Biblioteca de lugares reutilizables
- ✅ `movie_scenes` - Escenas con sistema de continuidad
- ✅ `scene_audio` - Audio separado del video
- ✅ `characters` - Campos añadidos: `lora_avatar_url`, `lora_locked`, `lora_locked_at`

### 2. Nuevas Clases TypeScript
- ✅ `CreativeDirectorV2` - Planifica recursos ANTES de generar
- ✅ `LocationManager` - Gestiona biblioteca de lugares
- ✅ `CharacterManagerV2` - Gestiona LoRA y avatares bloqueados
- ✅ `VideoGeneratorV2` - Genera videos con continuidad
- ✅ `AudioProcessor` - Procesa audio separado con lip sync

## Cómo Integrar en el Pipeline

### Paso 1: Planificación de Producción (ANTES de generar guión)

En `pipeline.ts`, después de validar proveedores, añadir:

```typescript
// ==========================================
// PASO 0.5: PLANIFICAR PRODUCCIÓN (NUEVO)
// ==========================================
await this.updateProgress('plan_production', 'running', 0, 'Planificando producción...')

const llmProviderWithKey = await getProviderWithKey(llmProvider.id)
const creativeDirectorV2 = new CreativeDirectorV2(
  this.supabase,
  llmProviderWithKey.apiKey,
  this.movieId
)

const productionPlan = await creativeDirectorV2.planProduction(
  this.movie.title,
  this.movie.user_prompt || this.movie.prompt || '',
  this.movie.genre || 'drama'
)

await this.updateProgress('plan_production', 'completed', 100, 'Producción planificada')
```

### Paso 2: Crear/Buscar Lugares Faltantes

Después de planificar, crear lugares que no están en la biblioteca:

```typescript
const locationManager = new LocationManager(this.supabase, imageProviderWithKey.apiKey)

for (const locReq of productionPlan.locations) {
  if (!locReq.found_in_library && locReq.needs_generation) {
    // Buscar en web primero
    if (locReq.needs_web_search) {
      const webImages = await locationManager.searchWebForLocation(locReq.location_name)
      if (webImages.length > 0) {
        // Usar imágenes de web
        await locationManager.createLocation(
          locReq.location_name,
          locReq.location_description,
          'unknown',
          webImages
        )
      }
    }
    
    // Si no hay imágenes de web, generar
    if (!locReq.library_location_id) {
      const generatedImages = await locationManager.generateLocationImages(
        locReq.location_name,
        locReq.location_description,
        5
      )
      const locationId = await locationManager.createLocation(
        locReq.location_name,
        locReq.location_description,
        'unknown',
        generatedImages
      )
      locReq.library_location_id = locationId
    }
  }
}
```

### Paso 3: Usar VideoGeneratorV2 para Videos con Continuidad

Reemplazar el uso de `CinematicVideoGenerator` con `VideoGeneratorV2`:

```typescript
const videoGeneratorV2 = new VideoGeneratorV2(
  this.supabase,
  videoProviderWithKey.apiKey,
  imageProviderWithKey.apiKey,
  this.movieId
)

let previousEndFrame: string | null = null
for (const scene of detailedScreenplay.scenes) {
  const continuityPlan = productionPlan.continuity.find(
    c => c.scene_number === scene.scene_number
  )
  
  if (!continuityPlan) continue
  
  const result = await videoGeneratorV2.generateSceneVideo(
    scene,
    continuityPlan,
    previousEndFrame
  )
  
  previousEndFrame = result.end_frame_url
  
  // Guardar en movie_scenes
  await this.supabase
    .from('movie_scenes')
    .upsert({
      movie_id: this.movieId,
      scene_number: scene.scene_number,
      location_id: continuityPlan.location_id,
      is_continuation: continuityPlan.is_continuation,
      continues_from_scene: continuityPlan.continues_from,
      video_url: result.video_url,
      video_prompt: scene.video_prompt,
      status: 'completed'
    } as any)
}
```

### Paso 4: Usar AudioProcessor para Audio Separado

Reemplazar el uso de `CinematicAudioGenerator` con `AudioProcessor`:

```typescript
const audioProcessor = new AudioProcessor(
  this.supabase,
  audioProviderWithKey.apiKey,
  syncLabsApiKey // Obtener de providers
)

for (const scene of detailedScreenplay.scenes) {
  const { data: movieScene } = await this.supabase
    .from('movie_scenes')
    .select('id, video_url')
    .eq('movie_id', this.movieId)
    .eq('scene_number', scene.scene_number)
    .single()
  
  if (!movieScene?.video_url) continue
  
  // Extraer diálogos de la escena
  const dialogues: Dialogue[] = scene.dialogue?.map((d: any) => ({
    character: d.character,
    line: d.line,
    emotion: d.emotion,
    delivery: d.delivery,
    timing: d.timing
  })) || []
  
  if (dialogues.length > 0) {
    const finalVideoUrl = await audioProcessor.processSceneDialogues(
      movieScene.id,
      dialogues,
      movieScene.video_url
    )
    
    // Actualizar escena con video final (con lip sync)
    await this.supabase
      .from('movie_scenes')
      .update({ video_url: finalVideoUrl })
      .eq('id', movieScene.id)
  }
}
```

## Orden de Ejecución Recomendado

1. ✅ Validar proveedores
2. ✅ **Planificar producción** (CreativeDirectorV2)
3. ✅ **Crear/buscar lugares faltantes** (LocationManager)
4. ✅ Crear Biblia Visual (CreativeDirector original)
5. ✅ Generar guión (CinematicScreenwriter)
6. ✅ Asignar personajes (CharacterManagerV2 si es necesario)
7. ✅ **Generar videos con continuidad** (VideoGeneratorV2)
8. ✅ **Procesar audio separado** (AudioProcessor)
9. ✅ Generar música
10. ✅ Ensamblar película (ProfessionalMovieAssembler)

## Notas Importantes

- Los prompts de video ahora son **cortos (<1000 chars)** sin diálogos
- Los diálogos se procesan **por separado** en AudioProcessor
- El sistema de continuidad usa **frames de referencia** entre escenas
- Los lugares se **reutilizan** entre películas desde la biblioteca
- Los personajes con LoRA están **bloqueados** visualmente
