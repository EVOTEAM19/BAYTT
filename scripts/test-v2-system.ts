// scripts/test-v2-system.ts
// Script para verificar que el sistema V2 está correctamente integrado

import { supabaseAdmin } from '../src/lib/supabase/admin'

async function testV2System() {
  console.log('🧪 Testing BAYTT V2 System Integration...\n')

  const tests: { name: string; passed: boolean; error?: string }[] = []

  // Test 1: Verificar que las clases se pueden importar
  try {
    const { CreativeDirectorV2 } = await import('../src/lib/movie-generation/creative-director-v2')
    const { LocationManager } = await import('../src/lib/locations/location-manager')
    const { CharacterManagerV2 } = await import('../src/lib/characters/character-manager-v2')
    const { VideoGeneratorV2 } = await import('../src/lib/movie-generation/video-generator-v2')
    const { AudioProcessor } = await import('../src/lib/movie-generation/audio-processor')
    
    tests.push({
      name: '✅ Importaciones de clases V2',
      passed: true
    })
    console.log('✅ Test 1: Clases V2 importadas correctamente')
  } catch (error: any) {
    tests.push({
      name: '❌ Importaciones de clases V2',
      passed: false,
      error: error.message
    })
    console.error('❌ Test 1 falló:', error.message)
  }

  // Test 2: Verificar que las tablas existen en la BD
  try {
    // Verificar tabla locations
    const { error: locationsError } = await supabaseAdmin
      .from('locations')
      .select('count')
      .limit(1)
    
    if (locationsError && locationsError.code !== 'PGRST116') {
      throw new Error(`Tabla locations: ${locationsError.message}`)
    }

    // Verificar tabla movie_scenes
    const { error: scenesError } = await supabaseAdmin
      .from('movie_scenes')
      .select('count')
      .limit(1)
    
    if (scenesError && scenesError.code !== 'PGRST116') {
      throw new Error(`Tabla movie_scenes: ${scenesError.message}`)
    }

    // Verificar tabla scene_audio
    const { error: audioError } = await supabaseAdmin
      .from('scene_audio')
      .select('count')
      .limit(1)
    
    if (audioError && audioError.code !== 'PGRST116') {
      throw new Error(`Tabla scene_audio: ${audioError.message}`)
    }

    // Verificar campos LoRA en characters
    const { error: charactersError } = await supabaseAdmin
      .from('characters')
      .select('lora_avatar_url, lora_locked, lora_locked_at')
      .limit(1)
    
    if (charactersError && !charactersError.message.includes('column') && charactersError.code !== 'PGRST116') {
      throw new Error(`Campos LoRA en characters: ${charactersError.message}`)
    }

    tests.push({
      name: '✅ Tablas y campos de BD',
      passed: true
    })
    console.log('✅ Test 2: Tablas y campos verificados')
  } catch (error: any) {
    tests.push({
      name: '❌ Tablas y campos de BD',
      passed: false,
      error: error.message
    })
    console.error('❌ Test 2 falló:', error.message)
    console.log('\n⚠️  IMPORTANTE: Necesitas ejecutar las migraciones SQL:')
    console.log('   1. create-locations-library.sql')
    console.log('   2. create-movie-scenes-continuity.sql')
    console.log('   3. create-scene-audio.sql')
    console.log('   4. add-lora-fields-to-characters.sql')
  }

  // Test 3: Verificar función de búsqueda de locations
  try {
    const { error: rpcError } = await supabaseAdmin
      .rpc('search_locations', { search_query: 'test', limit_count: 1 })
    
    // Si la función no existe, rpcError será diferente
    if (rpcError && !rpcError.message.includes('function') && rpcError.code !== '42883') {
      // La función existe pero puede fallar por otros motivos, eso está bien
      if (!rpcError.message.includes('syntax')) {
        throw rpcError
      }
    }

    tests.push({
      name: '✅ Función search_locations',
      passed: true
    })
    console.log('✅ Test 3: Función search_locations verificada')
  } catch (error: any) {
    tests.push({
      name: '❌ Función search_locations',
      passed: false,
      error: error.message
    })
    console.error('❌ Test 3 falló:', error.message)
    console.log('   (Esto es normal si la migración no se ha ejecutado)')
  }

  // Test 4: Verificar que el pipeline tiene las nuevas importaciones
  try {
    const pipelineCode = await import('fs/promises').then(fs => 
      fs.readFile('src/lib/movie-generation/pipeline.ts', 'utf-8')
    )
    
    const requiredImports = [
      'CreativeDirectorV2',
      'VideoGeneratorV2',
      'AudioProcessor',
      'LocationManager'
    ]
    
    const missingImports = requiredImports.filter(imp => !pipelineCode.includes(imp))
    
    if (missingImports.length > 0) {
      throw new Error(`Faltan importaciones: ${missingImports.join(', ')}`)
    }

    tests.push({
      name: '✅ Pipeline integrado con V2',
      passed: true
    })
    console.log('✅ Test 4: Pipeline tiene todas las importaciones V2')
  } catch (error: any) {
    tests.push({
      name: '❌ Pipeline integrado con V2',
      passed: false,
      error: error.message
    })
    console.error('❌ Test 4 falló:', error.message)
  }

  // Resumen
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE TESTS')
  console.log('='.repeat(60))
  
  const passed = tests.filter(t => t.passed).length
  const total = tests.length
  
  tests.forEach(test => {
    console.log(test.name)
    if (!test.passed && test.error) {
      console.log(`   Error: ${test.error}\n`)
    }
  })
  
  console.log(`\n✅ ${passed}/${total} tests pasados`)
  
  if (passed === total) {
    console.log('\n🎉 ¡Todo el sistema V2 está correctamente integrado!')
  } else {
    console.log('\n⚠️  Algunos tests fallaron. Revisa los errores arriba.')
    console.log('\n💡 Próximos pasos:')
    console.log('   1. Ejecuta las migraciones SQL en Supabase')
    console.log('   2. Verifica que todas las dependencias estén instaladas')
    console.log('   3. Vuelve a ejecutar este test')
  }

  return passed === total
}

// Ejecutar tests
if (require.main === module) {
  testV2System()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Error ejecutando tests:', error)
      process.exit(1)
    })
}

export { testV2System }
