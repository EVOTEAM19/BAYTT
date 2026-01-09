// Script para corregir la URL de Runway en la base de datos
// Ejecutar con: npx tsx scripts/fix-runway-url.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes')
  console.error('Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixRunwayUrl() {
  console.log('🔧 Corrigiendo URL de Runway en la base de datos...\n')

  // Buscar proveedor de Runway
  const { data: providers, error: fetchError } = await supabase
    .from('api_providers')
    .select('*')
    .eq('slug', 'runway')
    .eq('type', 'video')

  if (fetchError) {
    console.error('❌ Error buscando proveedor:', fetchError.message)
    process.exit(1)
  }

  if (!providers || providers.length === 0) {
    console.error('❌ No se encontró proveedor de Runway')
    process.exit(1)
  }

  for (const provider of providers) {
    console.log(`📋 Proveedor encontrado: ${provider.name}`)
    console.log(`   URL actual: ${provider.api_url}`)
    console.log(`   ID: ${provider.id}\n`)

    let newUrl = provider.api_url

    // Corregir hostname si es necesario
    if (newUrl && newUrl.includes('api.runwayml.com') && !newUrl.includes('api.dev.runwayml.com')) {
      newUrl = newUrl.replace('api.runwayml.com', 'api.dev.runwayml.com')
    } else if (!newUrl || newUrl === '') {
      newUrl = 'https://api.dev.runwayml.com/v1'
    } else if (!newUrl.includes('api.dev.runwayml.com')) {
      // Si tiene otra URL, cambiarla a la correcta
      newUrl = 'https://api.dev.runwayml.com/v1'
    }

    // Si la URL ya está correcta, no hacer nada
    if (newUrl === provider.api_url && newUrl.includes('api.dev.runwayml.com')) {
      console.log('✅ URL ya está correcta, no se necesita actualización\n')
      continue
    }

    console.log(`   Nueva URL: ${newUrl}\n`)

    // Actualizar proveedor
    const { error: updateError } = await supabase
      .from('api_providers')
      .update({
        api_url: newUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (updateError) {
      console.error(`❌ Error actualizando proveedor ${provider.id}:`, updateError.message)
    } else {
      console.log(`✅ Proveedor ${provider.name} actualizado correctamente\n`)
    }
  }

  console.log('✨ Corrección completada!')
}

fixRunwayUrl()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
