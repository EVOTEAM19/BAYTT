import { NextRequest, NextResponse } from 'next/server'

/**
 * API route para servir videos mock
 * En desarrollo, devuelve un video placeholder o información sobre el video
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params)
  const videoId = resolvedParams.id
  
  // En desarrollo, devolver un JSON con información del video mock
  // En producción, esto debería servir un video real
  return NextResponse.json({
    id: videoId,
    url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
    type: 'video/mp4',
    duration: 10,
    message: 'Video mock - En desarrollo, usar video real en producción'
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

