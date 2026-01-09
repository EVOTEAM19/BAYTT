import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const maxDuration = 60 // 60 segundos para uploads de imágenes
export const maxBodySize = '10mb' // Tamaño máximo del body

export async function POST(request: NextRequest) {
  try {
    console.log('[UPLOAD IMAGES] Starting image upload...')
    const supabase = await createServerSupabaseClient()
    
    // Verificar auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[UPLOAD IMAGES] Auth error:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    console.log('[UPLOAD IMAGES] User authenticated:', user.id)

    // Verificar que sea admin o superadmin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[UPLOAD IMAGES] Profile error:', profileError)
    }

    if (profile?.role !== "admin" && profile?.role !== "superadmin") {
      console.error('[UPLOAD IMAGES] Forbidden: user is not admin', profile?.role)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    console.log('[UPLOAD IMAGES] User is admin, proceeding...')
    
    const formData = await request.formData()
    console.log('[UPLOAD IMAGES] FormData received')
    
    // Intentar obtener archivos con diferentes nombres posibles
    let files: File[] = []
    if (formData.getAll('files').length > 0) {
      files = formData.getAll('files') as File[]
    } else if (formData.getAll('file').length > 0) {
      files = formData.getAll('file') as File[]
    } else {
      // Intentar obtener cualquier archivo
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          files.push(value)
        }
      }
    }
    
    console.log(`[UPLOAD IMAGES] Found ${files.length} file(s)`)
    
    if (files.length === 0) {
      console.error('[UPLOAD IMAGES] No files received')
      return NextResponse.json({ 
        error: 'No se recibieron archivos. Asegúrate de seleccionar imágenes válidas.' 
      }, { status: 400 })
    }
    
    const uploadedUrls: string[] = []
    const errors: string[] = []
    
    // Verificar que el bucket existe o intentar crear uno alternativo
    const bucketName = 'images'
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === bucketName)
    
    if (!bucketExists) {
      console.warn(`[UPLOAD IMAGES] Bucket '${bucketName}' does not exist, attempting to create...`)
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 10485760 // 10MB
      })
      
      if (createError) {
        console.error('[UPLOAD IMAGES] Failed to create bucket:', createError)
        // Intentar con un bucket alternativo
        const altBucketName = 'character-images'
        const altBucketExists = buckets?.some(b => b.name === altBucketName)
        if (!altBucketExists) {
          return NextResponse.json({ 
            error: `El bucket de almacenamiento no existe y no se pudo crear. Contacta al administrador.` 
          }, { status: 500 })
        }
      }
    }
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`[UPLOAD IMAGES] Processing file ${i + 1}/${files.length}: ${file.name} (${file.size} bytes, ${file.type})`)
      
      // Validar tipo
      if (!file.type || !file.type.startsWith('image/')) {
        const errorMsg = `El archivo "${file.name}" no es una imagen válida`
        console.error(`[UPLOAD IMAGES] ${errorMsg}`)
        errors.push(errorMsg)
        continue
      }
      
      // Validar tamaño (10MB)
      if (file.size > 10 * 1024 * 1024) {
        const errorMsg = `El archivo "${file.name}" es demasiado grande (máximo 10MB)`
        console.error(`[UPLOAD IMAGES] ${errorMsg}`)
        errors.push(errorMsg)
        continue
      }
      
      // Generar nombre único
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${uuidv4()}.${ext}`
      const filePath = `characters/temp/${user.id}/${fileName}`
      
      console.log(`[UPLOAD IMAGES] Uploading to: ${filePath}`)
      
      // Convertir a buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      
      // Subir a Supabase Storage usando admin para permisos
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600'
        })
      
      if (uploadError) {
        const errorMsg = `Error al subir "${file.name}": ${uploadError.message}`
        console.error(`[UPLOAD IMAGES] ${errorMsg}`, uploadError)
        errors.push(errorMsg)
        continue
      }
      
      console.log(`[UPLOAD IMAGES] ✅ File uploaded successfully: ${filePath}`)
      
      // Obtener URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(filePath)
      
      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl)
        console.log(`[UPLOAD IMAGES] Public URL: ${urlData.publicUrl}`)
      } else {
        const errorMsg = `No se pudo obtener la URL pública para "${file.name}"`
        console.error(`[UPLOAD IMAGES] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
    
    if (uploadedUrls.length === 0) {
      const errorMessage = errors.length > 0 
        ? `No se pudo subir ninguna imagen. Errores: ${errors.join('; ')}`
        : 'No se pudo subir ninguna imagen. Verifica que los archivos sean imágenes válidas y no excedan 10MB.'
      console.error(`[UPLOAD IMAGES] ${errorMessage}`)
      return NextResponse.json({ 
        error: errorMessage,
        details: errors.length > 0 ? errors : undefined
      }, { status: 400 })
    }
    
    console.log(`[UPLOAD IMAGES] ✅ Successfully uploaded ${uploadedUrls.length} image(s)`)
    
    return NextResponse.json({ 
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error: any) {
    console.error('[UPLOAD IMAGES] Unexpected error:', error)
    console.error('[UPLOAD IMAGES] Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Error al subir imágenes',
        details: error?.stack
      },
      { status: 500 }
    )
  }
}
