// Script temporal para configurar proveedores con API keys
// Ejecutar con: npx tsx scripts/setup-providers.ts

import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Función para encriptar API key
function encryptApiKey(apiKey: string): string {
  const ENCRYPTION_KEY = SUPABASE_SERVICE_ROLE_KEY.slice(0, 32);
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

// Proveedores a configurar
const providers = [
  {
    type: 'video',
    name: 'Runway Gen-3 Alpha Turbo',
    slug: 'runway',
    api_url: 'https://api.runwayml.com/v1/generate',
    auth_method: 'bearer',
    api_key: process.env.RUNWAY_API_KEY || '',
    config: {
      model: 'gen3a_turbo',
      resolution: '1280x768',
      duration: 10,
      seed: null,
      watermark: false
    },
    is_active: true,
    is_default: true,
    priority: 0,
    cost_per_second: 0.05,
    cost_per_request: 0,
    total_requests: 0,
    total_cost: 0,
  },
  {
    type: 'llm',
    name: 'OpenAI GPT-4 Turbo',
    slug: 'openai',
    api_url: 'https://api.openai.com/v1/chat/completions',
    auth_method: 'bearer',
    api_key: process.env.OPENAI_API_KEY || '',
    config: {
      model: 'gpt-4-turbo-preview',
      temperature: 0.8,
      max_tokens: 4096,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    },
    is_active: true,
    is_default: true,
    priority: 0,
    cost_per_second: 0,
    cost_per_request: 0.01,
    total_requests: 0,
    total_cost: 0,
  },
  {
    type: 'audio',
    name: 'ElevenLabs',
    slug: 'elevenlabs',
    api_url: 'https://api.elevenlabs.io/v1/text-to-speech',
    auth_method: 'api_key',
    api_key: process.env.ELEVENLABS_API_KEY || '',
    config: {
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      },
      output_format: 'mp3_44100_128'
    },
    is_active: true,
    is_default: true,
    priority: 0,
    cost_per_second: 0,
    cost_per_request: 0.0003,
    total_requests: 0,
    total_cost: 0,
  },
  {
    type: 'video', // Sync Labs es para lip sync, pero lo tratamos como video
    name: 'Sync Labs',
    slug: 'sync_labs',
    api_url: 'https://api.sync.so/v2/generate',
    auth_method: 'api_key',
    api_key: process.env.SYNC_LABS_API_KEY || '',
    config: {
      model: 'sync-1.6.0',
      output_format: 'mp4',
      active_speaker: true
    },
    is_active: true,
    is_default: false,
    priority: 1,
    cost_per_second: null,
    cost_per_request: 0.10,
    total_requests: 0,
    total_cost: 0,
  }
];

async function setupProviders() {
  console.log('🚀 Iniciando configuración de proveedores...\n');

  for (const provider of providers) {
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('api_providers')
        .select('id, name')
        .eq('slug', provider.slug)
        .maybeSingle();

      const providerData: any = {
        type: provider.type,
        name: provider.name,
        slug: provider.slug,
        api_url: provider.api_url,
        auth_method: provider.auth_method,
        config: provider.config,
        is_active: provider.is_active,
        is_default: provider.is_default,
        priority: provider.priority,
        cost_per_second: provider.cost_per_second,
        cost_per_request: provider.cost_per_request,
        total_requests: provider.total_requests,
        total_cost: provider.total_cost,
        api_key_encrypted: encryptApiKey(provider.api_key),
      };

      if (existing) {
        // Actualizar existente
        const { error } = await supabase
          .from('api_providers')
          .update(providerData)
          .eq('slug', provider.slug);

        if (error) {
          console.error(`❌ Error actualizando ${provider.name}:`, error.message);
        } else {
          console.log(`✅ Actualizado: ${provider.name}`);
        }
      } else {
        // Insertar nuevo
        const { error } = await supabase
          .from('api_providers')
          .insert(providerData);

        if (error) {
          console.error(`❌ Error creando ${provider.name}:`, error.message);
        } else {
          console.log(`✅ Creado: ${provider.name}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error con ${provider.name}:`, error.message);
    }
  }

  console.log('\n✨ Configuración completada!');
}

setupProviders();
