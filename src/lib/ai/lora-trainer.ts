// ============================================
// BAYTT - LoRA Trainer
// ============================================

import { getAIConfig, getProviderWithKey } from "./config";
import { decryptApiKey } from "@/lib/encryption/api-keys";
import JSZip from "jszip";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { v4 as uuidv4 } from "uuid";

// ============================================
// TIPOS
// ============================================

export interface LoRATrainingParams {
  character_id: string;
  character_name: string;
  training_images: string[]; // URLs de las 10-15 imágenes seleccionadas
  trigger_word: string; // Palabra única para activar el LoRA, ej: "BAYTT_MARCOS"
}

export interface TrainedLoRA {
  model_url: string;
  trigger_word: string;
  training_time_seconds: number;
  cost: number;
}

// ============================================
// ENTRENADOR DE LoRA
// ============================================

/**
 * Entrena un modelo LoRA personalizado para un personaje
 */
export async function trainCharacterLoRA(
  params: LoRATrainingParams
): Promise<TrainedLoRA> {
  const config = await getAIConfig();

  // Mock mode
  if (config.mockMode) {
    return {
      model_url: `mock://lora/${params.character_id}`,
      trigger_word: params.trigger_word,
      training_time_seconds: 0,
      cost: 0,
    };
  }

  // Obtener provider de entrenamiento LoRA configurado
  const loraProvider = config.loraTrainingProvider;
  if (!loraProvider) {
    throw new Error("No LoRA training provider configured");
  }

  const providerWithKey = await getProviderWithKey(loraProvider.id);
  if (!providerWithKey || !providerWithKey.apiKey) {
    throw new Error("Failed to get provider API key");
  }

  switch (loraProvider.slug) {
    case "replicate_lora":
      return await trainWithReplicate(providerWithKey.apiKey, params);
    case "fal_lora":
    case "fal_flux_lora": // Aceptar ambos slugs
      return await trainWithFal(providerWithKey.apiKey, params);
    default:
      throw new Error(`Unknown LoRA training provider: ${loraProvider.slug}`);
  }
}

// ============================================
// REPLICATE LoRA TRAINING
// ============================================

async function trainWithReplicate(
  apiKey: string,
  params: LoRATrainingParams
): Promise<TrainedLoRA> {
  const startTime = Date.now();

  // Crear ZIP de imágenes de entrenamiento
  // (En producción, las imágenes deben estar en un ZIP accesible por URL)
  // Por ahora, usamos la primera imagen como referencia
  // TODO: Implementar creación de ZIP con todas las imágenes

  const response = await fetch("https://api.replicate.com/v1/trainings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Modelo base Flux
      model: "ostris/flux-dev-lora-trainer",
      input: {
        input_images: params.training_images[0], // URL del ZIP o primera imagen
        trigger_word: params.trigger_word,
        steps: 1000,
        learning_rate: 0.0001,
        batch_size: 1,
        resolution: "1024",
        autocaption: true,
        autocaption_prefix: `a photo of ${params.trigger_word},`,
      },
      // Donde guardar el modelo entrenado
      destination: `baytt/${params.character_id}`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Replicate API error: ${error.error?.message || response.statusText}`
    );
  }

  const training = await response.json();

  // Polling hasta que termine (puede tomar 10-30 minutos)
  let result = training;
  let attempts = 0;
  const maxAttempts = 120; // Máximo 60 minutos (120 * 30s)

  while (
    result.status !== "succeeded" &&
    result.status !== "failed" &&
    attempts < maxAttempts
  ) {
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Check cada 30s
    const pollResponse = await fetch(result.urls.get, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollResponse.ok) {
      throw new Error(`Replicate polling error: ${pollResponse.statusText}`);
    }

    result = await pollResponse.json();
    attempts++;
  }

  if (result.status === "failed") {
    throw new Error(`LoRA training failed: ${result.error || "Unknown error"}`);
  }

  if (attempts >= maxAttempts) {
    throw new Error("LoRA training timeout - exceeded maximum wait time");
  }

  const endTime = Date.now();

  return {
    model_url: result.output?.model || result.output?.url || "",
    trigger_word: params.trigger_word,
    training_time_seconds: Math.round((endTime - startTime) / 1000),
    cost: 2.5,
  };
}

// ============================================
// FUNCIÓN AUXILIAR: CREAR ZIP CON IMÁGENES
// ============================================

async function createAndUploadImageZip(imageUrls: string[]): Promise<string> {
  console.log(`[FAL LoRA] Creating ZIP with ${imageUrls.length} images...`);
  
  const zip = new JSZip();
  
  // Descargar todas las imágenes y añadirlas al ZIP
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      console.log(`[FAL LoRA] Downloading image ${i + 1}/${imageUrls.length}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image ${i + 1}: ${response.statusText}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      const ext = url.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `image_${i + 1}.${ext}`;
      zip.file(fileName, imageBuffer);
      console.log(`[FAL LoRA] Added ${fileName} to ZIP`);
    } catch (error: any) {
      console.error(`[FAL LoRA] Error downloading image ${i + 1}:`, error);
      throw new Error(`Error downloading image from ${url}: ${error.message}`);
    }
  }
  
  // Generar el ZIP
  console.log(`[FAL LoRA] Generating ZIP file...`);
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  
  // Subir el ZIP a Supabase Storage
  // El bucket 'images' solo acepta image/*, necesitamos otro bucket o crear uno nuevo
  const zipFileName = `lora-training-${uuidv4()}.zip`;
  const zipFilePath = `lora-training/${zipFileName}`;
  
  // Intentar usar bucket 'movies' o crear un bucket temporal
  let bucketName = 'movies';
  let uploadError: any = null;
  
  // Verificar buckets disponibles
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const moviesBucketExists = buckets?.some(b => b.name === bucketName);
  
  if (!moviesBucketExists) {
    // Intentar crear bucket para archivos ZIP
    console.log(`[FAL LoRA] Bucket '${bucketName}' does not exist, attempting to create...`);
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024 // 50MB para ZIPs
      // No especificar allowedMimeTypes para permitir todos los tipos
    });
    
    if (createError) {
      console.error(`[FAL LoRA] Failed to create bucket:`, createError);
      // Intentar con bucket 'images' pero sin contentType
      bucketName = 'images';
    }
  }
  
  console.log(`[FAL LoRA] Uploading ZIP to Supabase Storage (bucket: ${bucketName}): ${zipFilePath}`);
  
  // Intentar subir sin contentType primero (permite más flexibilidad)
  let uploadResult = await supabaseAdmin.storage
    .from(bucketName)
    .upload(zipFilePath, zipBuffer, {
      upsert: false
    });
  
  uploadError = uploadResult.error;
  
  // Si falla, intentar con otro nombre de bucket o path
  if (uploadError) {
    console.log(`[FAL LoRA] Upload failed, error:`, uploadError.message);
    // Intentar con un bucket alternativo o crear uno específico
    throw new Error(`Error uploading ZIP to storage: ${uploadError.message}. El bucket puede tener restricciones de tipo de archivo.`);
  }
  
  // Obtener URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(zipFilePath);
  
  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for ZIP file');
  }
  
  console.log(`[FAL LoRA] ZIP uploaded successfully: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

// ============================================
// FAL.AI LoRA TRAINING (más rápido)
// ============================================

async function trainWithFal(
  apiKey: string,
  params: LoRATrainingParams
): Promise<TrainedLoRA> {
  const startTime = Date.now();

  console.log(`[FAL LoRA] Starting training with ${params.training_images.length} images`);
  console.log(`[FAL LoRA] Trigger word: ${params.trigger_word}`);
  console.log(`[FAL LoRA] Character: ${params.character_name}`);
  console.log(`[FAL LoRA] Image URLs received:`, params.training_images.slice(0, 2).map((url: string) => url.substring(0, 80) + '...'));

  // Verificar que las URLs sean accesibles públicamente
  // FAL.AI necesita poder descargar las imágenes
  for (const url of params.training_images) {
    if (!url || (typeof url !== 'string')) {
      throw new Error(`URL inválida: debe ser un string válido`);
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`URL inválida (no es HTTP/HTTPS): ${url.substring(0, 50)}`);
    }
  }

  // Validar que tengamos al menos 5 imágenes
  if (params.training_images.length < 5) {
    throw new Error(`Se requieren al menos 5 imágenes para entrenar LoRA. Recibidas: ${params.training_images.length}`);
  }

  // Sanitizar trigger_word (eliminar caracteres especiales problemáticos)
  const sanitizedTriggerWord = params.trigger_word
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales excepto guiones y espacios
    .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
    .substring(0, 50); // Limitar longitud

  // FAL.AI flux-lora-fast-training requiere un ZIP con todas las imágenes
  // Error: "Failed to unpack archive" - espera un archivo ZIP, no URLs JPEG directas
  // Crear ZIP con todas las imágenes y obtener su URL pública
  console.log(`[FAL LoRA] Creating ZIP archive with ${params.training_images.length} images...`);
  const zipUrl = await createAndUploadImageZip(params.training_images);
  
  // FAL.AI requiere images_data_url como string (URL del ZIP)
  const requestBody: any = {
    images_data_url: zipUrl, // URL del ZIP (requerido por FAL.AI)
    trigger_word: sanitizedTriggerWord,
    steps: 1000,
    create_masks: true,
    is_style: false, // Es un personaje, no un estilo
  };

  console.log(`[FAL LoRA] Request body summary:`, {
    trigger_word: requestBody.trigger_word,
    images_data_url: requestBody.images_data_url?.substring(0, 80) + '...',
    steps: requestBody.steps,
    create_masks: requestBody.create_masks,
    is_style: requestBody.is_style
  });
  
  console.log(`[FAL LoRA] Full request body JSON (first 1000 chars):`, 
    JSON.stringify(requestBody, null, 2).substring(0, 1000)
  );

  const response = await fetch(
    "https://fal.run/fal-ai/flux-lora-fast-training",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  console.log(`[FAL LoRA] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[FAL LoRA] ❌ Error response (${response.status}):`, errorText);
    console.error(`[FAL LoRA] Request body sent (first 500 chars):`, JSON.stringify(requestBody, null, 2).substring(0, 500));
    
    let errorMessage = `Fal.ai API error: ${response.status} ${response.statusText}`;
    
    try {
      const error = JSON.parse(errorText);
      console.error('[FAL LoRA] Parsed error:', JSON.stringify(error, null, 2));
      
      // Intentar extraer mensaje más descriptivo
      let detailMsg: string | undefined;
      if (error.detail?.message) {
        detailMsg = typeof error.detail.message === 'string' ? error.detail.message : JSON.stringify(error.detail.message);
      } else if (error.detail) {
        detailMsg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
      } else if (error.message) {
        detailMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
      } else if (error.error?.message) {
        detailMsg = typeof error.error.message === 'string' ? error.error.message : JSON.stringify(error.error.message);
      }
      
      const validationErrs = error.detail?.validation_errors || error.validation_errors || error.detail?.errors;
      
      if (validationErrs) {
        const errStr = typeof validationErrs === 'string' ? validationErrs : JSON.stringify(validationErrs);
        errorMessage = `Fal.ai validation error: ${errStr}`;
      } else if (detailMsg) {
        errorMessage = `Fal.ai API error: ${detailMsg}`;
      } else {
        errorMessage = `Fal.ai API error: ${JSON.stringify(error)}`;
      }
    } catch (e) {
      console.error('[FAL LoRA] Could not parse error:', e);
      errorMessage = `Fal.ai API error: ${errorText.substring(0, 500)}`;
    }
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log(`[FAL LoRA] Training started, result:`, result);
  
  // Si FAL.AI devuelve un request_id, necesitamos hacer polling
  let finalResult = result;
  if (result.request_id && !result.model_url) {
    console.log(`[FAL LoRA] Polling for result with request_id: ${result.request_id}`);
    finalResult = await pollFalLoRATraining(apiKey, result.request_id);
  }
  
  const endTime = Date.now();

  return {
    model_url: finalResult.diffusers_lora_file?.url || finalResult.model_url || finalResult.model?.url || "",
    trigger_word: params.trigger_word,
    training_time_seconds: Math.round((endTime - startTime) / 1000),
    cost: 2.0,
  };
}

// Polling para el resultado del entrenamiento de FAL.AI
async function pollFalLoRATraining(
  apiKey: string,
  requestId: string,
  maxAttempts: number = 120 // 20 minutos máximo (10 segundos * 120)
): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
    
    const response = await fetch(
      `https://fal.run/fal-ai/flux-lora-fast-training/requests/${requestId}`,
      {
        headers: {
          Authorization: `Key ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Fal.ai polling error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status === 'COMPLETED') {
      return data;
    } else if (data.status === 'FAILED') {
      throw new Error(`Fal.ai training failed: ${data.error || 'Unknown error'}`);
    }
    
    console.log(`[FAL LoRA] Polling attempt ${attempt + 1}/${maxAttempts}, status: ${data.status}`);
  }
  
  throw new Error('Fal.ai training timeout');
}
