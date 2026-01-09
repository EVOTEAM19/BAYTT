import { NextRequest, NextResponse } from 'next/server'

/**
 * API route para servir frames mock (primera/última escena)
 * En desarrollo, redirige a una imagen placeholder
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params)
  const frameId = resolvedParams.id
  
  // Redirigir a una imagen placeholder de Picsum Photos
  // Usamos el ID como seed para que sea consistente
  const seed = frameId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || '1'
  const placeholderUrl = `https://picsum.photos/seed/${seed}/1920/1080`
  
  // Redirigir a la imagen placeholder
  return NextResponse.redirect(placeholderUrl)
}

