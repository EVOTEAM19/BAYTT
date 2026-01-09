# 📹 FLUJO COMPLETO DE GENERACIÓN DE VIDEO

## Resumen Ejecutivo

Este documento describe el flujo exacto de generación de video desde la validación de proveedores hasta la finalización de la película. El proceso consta de **11 pasos principales** que se ejecutan secuencialmente.

---

## 🔄 FLUJO COMPLETO PASO A PASO

### **PASO 0: VALIDAR PROVEEDORES**
**Estado:** `validate_providers` → `running` → `completed`

1. **Cargar datos de la película** (`loadMovie()`)
   - Obtiene la película desde la BD usando `movieId`
   - Valida que existe
   - Guarda en `this.movie`

2. **Cargar proveedores** (`loadProviders()`)
   - Obtiene proveedores activos desde `api_providers`
   - Filtra por `is_active = true` y `provider_type` válido
   - Organiza en `Map<provider_type, provider>`

3. **Validar proveedores requeridos**
   - ✅ **Requeridos:** `llm`, `video`, `audio`
   - ❌ Si falta alguno → Error y aborta pipeline

**Resultado:** Proveedores listos para usar

---

### **PASO 0.5: PLANIFICAR PRODUCCIÓN**
**Estado:** `plan_production` → `running` → `completed`

1. **Obtener API Key del LLM**
   - Decripta la API key del proveedor LLM
   - Crea `CreativeDirectorV2`

2. **Planificar producción** (`planProduction()`)
   - Analiza título, prompt y género
   - Genera plan de producción con:
     - **Locaciones** (locations) necesarias
     - **Personajes** (characters) a usar
     - **Plan de continuidad** (continuity) entre escenas
     - **Referencias de frames** para transiciones

3. **Crear/Generar locaciones faltantes**
   - Para cada locación que no existe en la biblioteca:
     - Busca imágenes en web (si `needs_web_search = true`)
     - O genera imágenes con FAL.AI (si no hay resultados web)
     - Crea entrada en `locations_library`
   - Asigna `location_id` al plan de continuidad

**Resultado:** Plan de producción completo con locaciones y continuidad

---

### **PASO 1: CREAR BIBLIA VISUAL**
**Estado:** `create_visual_bible` → `running` → `completed`

1. **Crear Director Creativo** (`CreativeDirector`)
   - Usa API key del LLM
   - Crea instancia con `movieId`

2. **Generar Biblia Visual** (`createVisualBible()`)
   - Analiza título, prompt, género y duración
   - Genera:
     - Estilo visual
     - Paleta de colores
     - Estilo de cámara
     - Tono emocional
     - Referencias cinematográficas
   - Guarda en `visual_bibles` (tabla)

**Resultado:** Biblia visual creada y guardada

---

### **PASO 2: GENERAR GUIÓN CINEMATOGRÁFICO**
**Estado:** `generate_screenplay` → `running` → `completed`

1. **Crear Guionista Cinematográfico** (`CinematicScreenwriter`)
   - Usa API key del LLM
   - Usa Biblia Visual generada

2. **Escribir guión detallado** (`writeScreenplay()`)
   - Genera escenas detalladas con:
     - `scene_number`, `scene_id`
     - `header`: location, time, setting
     - `characters_in_scene`: lista de personajes
     - `action_description`: descripción de acción (beat-by-beat)
     - `dialogue`: diálogos con timing y emociones
     - `duration`: `screen_time_seconds`, `real_time_seconds`
     - `camera`: movimientos, ángulos, shots
     - `visual_prompt`: prompt optimizado para generación
   - **Cantidad de escenas:** Basado en `duration_minutes` (1 escena ≈ 1-2 minutos)

3. **Guardar guión**
   - Guarda en `scripts` (formato legacy)
   - Guarda `screenplay_detailed` en `movies.metadata`
   - Crea entradas en `movie_scenes` (tabla) con estado `pending`

**Resultado:** Guión detallado generado y guardado

---

### **PASO 3: ASIGNAR PERSONAJES**
**Estado:** `assign_characters` → `running` → `completed`

1. **Extraer personajes del guión** (`selectCharacters()`)
   - Analiza todas las escenas
   - Identifica personajes mencionados
   - Busca en `characters` (tabla) si existen
   - Si no existen, los crea automáticamente

2. **Generar imágenes de personajes** (`generateCharacterImages()`)
   - Para cada personaje sin imagen:
     - Genera imagen con FAL.AI usando descripción
     - Guarda en `characters.character_image_url`

**Resultado:** Personajes asignados con imágenes generadas

---

### **PASO 4: GENERAR VIDEOS CON CONTINUIDAD** ⭐ **CRÍTICO**
**Estado:** `generate_videos` → `running` → `completed`

Este es el paso más importante y donde ocurren la mayoría de errores.

#### **4.1 Preparación**

1. **Obtener proveedores necesarios**
   - Video provider (Runway) → `videoProviderWithKey`
   - Image provider (FAL.AI) → `imageProviderWithKey`
   - Validar que ambos tengan API keys

2. **Verificar/Crear planes de continuidad**
   - Para cada escena del guión:
     - Busca plan en `productionPlan.continuity`
     - Si no existe, crea uno nuevo con:
       - `is_continuation`: true si `i > 0`
       - `continues_from`: número de escena anterior
       - `location_id`: buscado desde `header.location`

3. **Crear VideoGeneratorV2**
   - Pasa: `supabase`, `runwayApiKey`, `imageApiKey`, `movieId`, `videoProviderWithKey` (completo)

#### **4.2 Generación Escena por Escena** (Loop)

Para cada escena en `detailedScreenplay.scenes`:

```
For i = 0 to scenes.length - 1:
```

**4.2.1 Obtener plan de continuidad**
- Busca `continuityPlan` para `scene.scene_number`

**4.2.2 Generar video de la escena** (`generateSceneVideo()`)

**A) Obtener imagen de referencia** (usando `ReferenceImageManager`):
   - **CASO 1: Es continuación** (`is_continuation = true`) y hay `previousEndFrame` válido:
     → ✅ Usa `previousEndFrame` (último frame de escena anterior)
     → Source: `'previous_frame'`
   
   - **CASO 2: Buscar en biblioteca `location_images`:**
     → Busca por `location_slug + time_of_day + weather`
     → Si encuentra: ✅ Usa imagen de biblioteca, incrementa `times_used`
     → Source: `'library'`
   
   - **CASO 3: No existe en biblioteca:**
     → Genera nueva imagen con FAL.AI usando prompt detallado del lugar
     → Guarda automáticamente en `location_images` con:
       - `location_name`, `location_slug`
       - `time_of_day`, `weather`
       - `image_url`, `generation_prompt`
       - `created_by_movie_id`
     → Source: `'generated'`
   
   ⭐ **IMPORTANTE:** Siempre tenemos imagen de referencia, nunca usamos placeholder

**B) Construir prompt de video:**
   - Usa `buildShortVideoPrompt()` (máx 1000 chars)
   - **NO incluye diálogos** (van al audio)
   - Incluye: estilo, ubicación, tiempo, acción, personajes, cámara

   **C) Llamar a Runway** (`callRunway()`):

   ⭐ **SIEMPRE usa `image_to_video`** porque siempre tenemos imagen de referencia
   
   **Configuración:**
   - **Modelo:** `gen3a_turbo` (SIEMPRE)
   - **Ratio:** `"1280:768"` (horizontal/landscape)
     - ⚠️ **CRÍTICO:** Runway NO acepta `"16:9"` para `image_to_video`
     - Runway solo acepta: `"1280:768"` o `"768:1280"` (valores específicos, no simplificados)
     - Error si usas formato incorrecto: `"ratio must be one of: 768:1280, 1280:768"`
   - **Duración:** `10` segundos (SIEMPRE)
   - **Endpoint:** `https://api.dev.runwayml.com/v1/image_to_video` (SIEMPRE)
   
   **Request body:**
   ```json
   {
     "model": "gen3a_turbo",
     "promptText": "...",
     "promptImage": "URL de imagen de referencia",  // ⭐ SIEMPRE presente
     "ratio": "1280:768",  // ⭐ CORRECTO (NO "16:9")
     "duration": 10,
     "watermark": false
   }
   ```

   **Proceso:**
   1. Valida que la URL de imagen sea accesible (HEAD request, timeout 5s)
   2. Construye endpoint: `https://api.dev.runwayml.com/v1/{image_to_video|text_to_video}`
   3. Crea request body:
      ```json
      {
        "model": "gen3a_turbo",
        "promptText": "...",
        "ratio": "16:9",
        "duration": 10,
        "watermark": false,
        "promptImage": "url" // Solo si image_to_video
      }
      ```
   4. Hace POST a Runway API
   5. Obtiene `taskId` de la respuesta
   6. Inicia polling

**D) Polling de Runway** (`pollRunwayTask()`):

   - **URL:** `https://api.dev.runwayml.com/v1/tasks/{taskId}`
   - **Máximo intentos:** 120 (10 minutos total)
   - **Intervalo:** 5 segundos entre intentos
   - **Estados:**
     - `PENDING` / `IN_PROGRESS` / `PROCESSING` → Continúa polling
     - `SUCCEEDED` / `COMPLETED` → Extrae `videoUrl` y termina
     - `FAILED` / `failed` → Lanza error con mensaje

   **Extracción de videoUrl:**
   - Busca en múltiples campos:
     - `data.output?.[0]`
     - `data.output_url`
     - `data.url`
     - `data.video_url`
     - `data.result?.output?.[0]`
     - `data.result?.output_url`

   **Validación:**
   - Si `status = SUCCEEDED` pero no hay `videoUrl` → Error
   - Si `videoUrl` es `null`, `''`, `'null'`, `'undefined'` → Error

**E) Validar resultado:**
   - ⭐ **CRÍTICO:** Verifica que `videoUrl` sea válido
   - Si no es válido → Lanza error (no continúa)

**F) Extraer último frame:**
   - `extractEndFrame()` genera imagen del final de la escena
   - Usa FAL.AI con descripción del final
   - Si falla, usa el `videoUrl` como fallback

**G) Extraer último frame:**
   - `referenceManager.extractEndFrame()` genera imagen representativa del final
   - Usa FAL.AI con descripción del final de la escena
   - Si falla, usa el `videoUrl` como fallback
   - Este frame se guarda para usar en la siguiente escena (si es continuación)

**4.2.3 Guardar resultado en BD** (mediante `saveSceneData()`):

**UPDATE en `movie_scenes`:**
   - `reference_image_url`: URL de la imagen de referencia usada
   - `reference_image_source`: `'library'` | `'generated'` | `'previous_frame'`
   - `end_frame_url`: URL del último frame extraído
   - `location_image_id`: ID de la imagen en `location_images` (si aplica)
   - `video_url`: URL del video generado
   - `status`: `'completed'`
   - `updated_at`: timestamp actual

**4.2.4 Guardar imagen generada en biblioteca** (si `source = 'generated'`):
   - Se guarda automáticamente en `location_images` con:
     - `location_name`, `location_slug`
     - `time_of_day`, `weather`
     - `image_url`, `generation_prompt`
     - `created_by_movie_id`
   - Esto permite reutilizar la imagen en escenas futuras

**4.2.5 Agregar a array de videos:**
   ```javascript
   videos.push({
     scene_number: scene.scene_number,
     scene_id: scene.scene_id,
     video_url: result.video_url, // ⭐ DEBE SER VÁLIDO
     start_frame_url: result.reference_image_url,
     last_frame_url: result.end_frame_url,
     reference_image_url: result.reference_image_url,
     reference_source: result.reference_source, // 'library' | 'generated' | 'previous_frame'
     duration: scene.duration.screen_time_seconds || 10,
     status: 'completed' // ⭐ SOLO si video_url es válido
   })
   ```

**4.2.6 Actualizar progreso:**
   - `updateProgress('generate_videos', 'running', X%, 'Escena X/Y generada')`

**4.2.7 Manejo de errores:**

Si ocurre error durante generación:

```javascript
catch (error) {
  // Agregar a videos array con status='failed'
  videos.push({
    scene_number: scene.scene_number,
    scene_id: scene.scene_id,
    video_url: null, // ⭐ NULL = No hay video
    duration: ...,
    status: 'failed', // ⭐ FAILED
    error: error.message
  })
  
  // Actualizar en BD
  UPDATE movie_scenes SET
    status = 'failed',
    error_message = error.message,
    video_url = null // ⭐ NO guardar URL vacía
}
```

**4.2.8 Actualizar `previousEndFrame`:**
   - Solo si la generación fue exitosa
   - `previousEndFrame = result.end_frame_url`
   - Este frame se usará en la siguiente escena si `is_continuation = true`

#### **4.3 Verificación Final**

Después del loop:
- Cuenta videos completados vs fallidos
- Actualiza progreso con resumen
- Si todas las escenas fallaron → El pipeline puede continuar pero el ensamblaje fallará

**Resultado:** Array `videos[]` con todas las escenas (completadas o fallidas)

---

### **PASO 5: GENERAR AUDIO Y APLICAR LIP SYNC**
**Estado:** `generate_audio` → `running` → `completed`

1. **Obtener proveedores de audio**
   - Audio provider (ElevenLabs)
   - Lip sync provider (SyncLabs) - opcional

2. **Procesar cada escena:**

   Para cada escena en `detailedScreenplay.scenes`:
   
   **A) Verificar que existe video:**
      - Obtiene `movieScene` desde `movie_scenes`
      - Si no hay `video_url` → Salta esta escena
   
   **B) Extraer diálogos:**
      - De `scene.dialogue[]`
      - Incluye: character, line, emotion, delivery, timing
   
   **C) Procesar diálogos** (`AudioProcessor.processSceneDialogues()`):
      - Para cada diálogo:
        1. Genera audio con ElevenLabs usando voz del personaje
        2. Guarda en `scene_audio` (tabla)
        3. Aplica lip sync con SyncLabs (si está configurado)
        4. Mezcla audio con video
        5. Actualiza `movie_scenes.video_url` con video final (con lip sync)
   
   **D) Obtener audios generados:**
      - Query `scene_audio` para obtener todos los audios
      - Agrega a `dialogueAudioDetailed[]`

3. **Convertir a formato legacy:**
   - Mapea `dialogueAudioDetailed` a formato `dialogueAudio` para compatibilidad

**Resultado:** Array `dialogueAudioDetailed[]` con todos los audios y videos con lip sync aplicado

---

### **PASO 6: GENERAR MÚSICA**
**Estado:** `generate_music` → `running` → `completed`

1. **Verificar proveedor de música:**
   - Busca provider con `provider_type = 'music'`
   - Si no existe → Retorna `null` (no es crítico)

2. **Generar música de fondo:**
   - **NOTA:** Actualmente deshabilitado (Beatoven API tiene problemas)
   - Retorna `null`

**Resultado:** `music = null` (por ahora)

---

### **PASO 7: ENSAMBLAR PELÍCULA** ⭐ **CRÍTICO**
**Estado:** `assemble_movie` → `running` → `completed`

#### **7.1 Validación de Videos**

**A) Verificar array de videos:**
```javascript
console.log(`Total videos: ${videos.length}`)
// Log de cada video: status, video_url exists?
```

**B) Filtrar videos válidos:**
```javascript
const videosForAssembly = videos.filter(v => {
  const hasValidUrl = v.video_url && 
                     v.video_url.trim() !== '' && 
                     v.video_url !== 'null' && 
                     v.video_url !== 'undefined' &&
                     v.status === 'completed' // ⭐ SOLO 'completed'
  
  return hasValidUrl
})
```

**C) Validar que hay videos:**
```javascript
if (videosForAssembly.length === 0) {
  const failedCount = videos.filter(v => v.status === 'failed').length
  const invalidCount = videos.filter(v => 
    v.status === 'completed' && !v.video_url
  ).length
  
  throw new Error(
    `No videos to assemble: Failed=${failedCount}, Invalid=${invalidCount}`
  )
}
```

**D) Ordenar por número de escena:**
```javascript
const sortedVideos = videosForAssembly.sort((a, b) => 
  a.scene_number - b.scene_number
)
```

#### **7.2 Ensamblaje Profesional**

1. **Crear ProfessionalMovieAssembler:**
   - Pasa: `supabase`, `movieId`, `visualBible`

2. **Ensamblar** (`assembler.assemble()`):
   - Pasa: `sortedVideos`, `dialogueAudioDetailed`, `detailedScreenplay`, `music`
   
   **Proceso interno:**
   - Filtra videos con `status === 'completed' && video_url`
   - Ordena por `scene_number`
   - Determina transiciones según guión
   - Construye comando FFmpeg (en producción)
   - Ejecuta ensamblaje
   - Aplica color grading unificado
   - Retorna URL del video final

3. **Actualizar película:**
   ```javascript
   UPDATE movies SET
     video_url = finalVideoUrl
   WHERE id = movieId
   ```

**Resultado:** Video final ensamblado guardado en `movies.video_url`

---

### **PASO 8: GENERAR PORTADA**
**Estado:** `generate_cover` → `running` → `completed`

1. **Verificar si existe portada:**
   - Query: `SELECT thumbnail_url, poster_url FROM movies WHERE id = movieId`
   - Si existe → Usa existente, salta generación

2. **Generar nueva portada** (solo si no existe):
   - Obtiene proveedor de imagen (FAL.AI)
   - Crea prompt: `"Movie poster for {title}: {prompt}, cinematic, professional"`
   - Genera imagen con `generateImageWithFlux()`
   - Retorna `{ poster_url, thumbnail_url }`

3. **Guardar portada:**
   - Se guarda en `finalize()` (PASO 9)

**Resultado:** Portada generada o existente

---

### **PASO 9: FINALIZAR**
**Estado:** `finalize` → `running` → `completed`

1. **Subir archivos finales:**
   - Por ahora, solo retorna URLs (no sube físicamente)
   - Prepara objeto:
     ```javascript
     {
       video_url: finalVideoUrl,
       poster_url: cover.poster_url,
       thumbnail_url: cover.thumbnail_url || cover.poster_url
     }
     ```

2. **Finalizar película** (`finalize()`):
   ```javascript
   UPDATE movies SET
     video_url = uploadedUrls.video_url,
     poster_url = uploadedUrls.poster_url,
     thumbnail_url = uploadedUrls.thumbnail_url,
     status = 'completed', // o 'failed' si todas las escenas fallaron
     progress = 100
   WHERE id = movieId
   ```

3. **Verificar escenas fallidas:**
   - Lee `movies.metadata.failed_scenes`
   - Si hay escenas fallidas:
     - Si todas fallaron → `status = 'failed'`
     - Si solo algunas → `status = 'completed'` (con advertencia)

4. **Actualizar progreso final:**
   ```javascript
   UPSERT movie_creation_progress SET
     overall_status = 'completed',
     overall_progress = 100,
     current_step = 'completed',
     current_step_detail = '¡Película completada exitosamente!'
   ```

**Resultado:** Película marcada como `completed` o `failed`

---

## ⚠️ PUNTOS CRÍTICOS DEL FLUJO

### 1. **Validación de video_url en múltiples puntos:**

   ✅ **Después de polling Runway:**
   ```javascript
   if (!videoUrl || videoUrl.trim() === '' || videoUrl === 'null' || videoUrl === 'undefined') {
     throw new Error('Invalid video URL')
   }
   ```

   ✅ **Después de generateSceneVideo:**
   ```javascript
   if (!result.video_url || result.video_url.trim() === '') {
     throw new Error('Invalid video URL returned')
   }
   ```

   ✅ **Antes de guardar en BD:**
   ```javascript
   if (status === 'completed' && !videoUrl) {
     finalStatus = 'failed'
   }
   ```

   ✅ **Antes de ensamblar:**
   ```javascript
   const validVideos = videos.filter(v => 
     v.status === 'completed' && 
     v.video_url && 
     v.video_url.trim() !== '' &&
     v.video_url !== 'null'
   )
   ```

### 2. **Configuración de Runway (SIEMPRE igual):**

   - **Modelo:** `gen3a_turbo` (siempre)
   - **Ratio:** 
     - `image_to_video`: `"1280:768"` (horizontal/landscape) o `"768:1280"` (vertical/portrait)
     - `text_to_video`: `"1280:768"` (por ahora)
     - ⚠️ **CRÍTICO:** Runway NO acepta `"16:9"` para `image_to_video`, solo acepta formatos específicos
   - **Duración:** `10` segundos (siempre)
   - **Endpoint:** `image_to_video` si hay imagen válida, `text_to_video` si no

### 3. **Manejo de errores:**

   - Si una escena falla → No aborta el pipeline
   - Se marca como `failed` y continúa con la siguiente
   - Si todas fallan → Ensamblaje falla con error claro

### 4. **Guardado en BD:**

   - **Tabla `movie_scenes`:** Guarda progreso de cada escena
   - **Tabla `movies`:** Guarda video final y portada
   - **Tabla `scene_audio`:** Guarda audios generados
   - **Tabla `movie_creation_progress`:** Guarda progreso general

---

## 🔍 FLUJO DE DATOS

```
validate_providers
  ↓
plan_production
  ↓ (genera productionPlan)
create_visual_bible
  ↓ (genera visualBible)
generate_screenplay
  ↓ (genera detailedScreenplay)
assign_characters
  ↓ (genera characters[])
generate_videos
  ↓ (loop por cada escena)
  → callRunway() → pollRunwayTask() → videoUrl
  ↓ (genera videos[])
generate_audio
  ↓ (procesa cada escena con diálogos)
  → ElevenLabs → SyncLabs → dialogueAudioDetailed[]
generate_music
  ↓ (genera music = null por ahora)
assemble_movie
  ↓ (filtra videos válidos)
  → ProfessionalMovieAssembler.assemble() → finalVideoUrl
generate_cover
  ↓ (genera cover = { poster_url, thumbnail_url })
finalize
  ↓ (guarda todo en BD)
✅ COMPLETED
```

---

## ✅ VALIDACIONES FINALES

Antes de marcar como `completed`, el sistema verifica:

1. ✅ Hay al menos un video válido para ensamblar
2. ✅ Todos los videos tienen `status === 'completed'` y `video_url` válido
3. ✅ El video final se guardó en `movies.video_url`
4. ✅ La portada se generó o ya existía
5. ✅ El estado se actualizó correctamente en BD

---

## 🐛 POSIBLES PROBLEMAS Y SOLUCIONES

### Problema: "No videos to assemble"
**Causa:** Todas las escenas fallaron o no tienen `video_url` válido
**Solución:** Revisar logs de generación de cada escena, verificar API keys de Runway

### Problema: "Scene X marked as completed but has invalid video_url"
**Causa:** Se guardó como `completed` pero el `video_url` es `null` o inválido
**Solución:** Validación mejorada ahora previene esto, pero escenas antiguas pueden tener este problema

### Problema: "Runway task completed but no video URL in response"
**Causa:** Runway retornó `SUCCEEDED` pero no incluyó URL en la respuesta
**Solución:** Revisar logs del polling para ver la estructura exacta de la respuesta

### Problema: "Video generation for scene X failed"
**Causa:** Puede ser API key inválida, balance agotado, o error en el request
**Solución:** Revisar logs detallados del error específico

---

## 📊 ESTADO DEL PIPELINE

El pipeline actualiza `movie_creation_progress` con estos estados:

1. `validate_providers` → `running` → `completed`
2. `plan_production` → `running` → `completed`
3. `create_visual_bible` → `running` → `completed`
4. `generate_screenplay` → `running` → `completed`
5. `assign_characters` → `running` → `completed`
6. `generate_videos` → `running` → `completed`
7. `generate_audio` → `running` → `completed`
8. `generate_music` → `running` → `completed`
9. `assemble_movie` → `running` → `completed`
10. `generate_cover` → `running` → `completed`
11. `finalize` → `running` → `completed`

Cada paso tiene su propio `progress` (0-100%) y `current_step_detail`.

---

## 🔧 NOTAS TÉCNICAS IMPORTANTES

### Ratio Correcto para Runway

⚠️ **CRÍTICO:** Runway API tiene diferentes requisitos de ratio según el endpoint:

- **`image_to_video` con `gen3a_turbo`:**
  - ✅ Acepta: `"1280:768"` (horizontal/landscape) o `"768:1280"` (vertical/portrait)
  - ❌ NO acepta: `"16:9"`, `"9:16"`, `"1280:720"`, etc.
  - Error si usas formato incorrecto: `"ratio must be one of: 768:1280, 1280:768"`
  
- **`text_to_video` con `gen3a_turbo`:**
  - Por ahora se usa `"1280:768"` también, verificar documentación de Runway si es necesario

### Sistema de Imágenes de Referencia con Biblioteca

El sistema ahora usa `ReferenceImageManager` para gestionar todas las imágenes de referencia.

**Tabla `location_images`:**
- Almacena imágenes de lugares con variantes (hora del día, clima)
- Índice único: `location_slug + time_of_day + weather`
- Permite búsqueda rápida y reutilización

**Flujo de decisión:**
1. **Si es continuación** → Usa último frame de escena anterior (`previous_frame`)
2. **Si NO es continuación** → Busca en `location_images`
3. **Si existe en biblioteca** → Reutiliza, incrementa `times_used`
4. **Si NO existe** → Genera con FAL.AI, guarda en biblioteca

**Beneficios:**
- ✅ Continuidad visual perfecta entre escenas continuas
- ✅ Reutilización de imágenes entre escenas del mismo lugar
- ✅ Reutilización entre películas diferentes
- ✅ Ahorro de tiempo y costos (menos llamadas a FAL.AI)
- ✅ Consistencia visual garantizada

**Archivos clave:**
- `reference-image-manager.ts`: Gestor principal
- `video-generator-v2.ts`: Usa el gestor en `generateSceneVideo()`
- `create-location-images-library.sql`: Migración SQL

---

**Última actualización:** 2024-01-XX
**Versión del pipeline:** V2 (con VideoGeneratorV2 y continuidad mejorada)
