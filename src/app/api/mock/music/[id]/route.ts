import { NextRequest, NextResponse } from 'next/server'

/**
 * API route para servir música mock
 * En desarrollo, devuelve información sobre el audio mock
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params)
  const musicId = resolvedParams.id
  
  // En desarrollo, devolver un JSON con información del audio mock
  // En producción, esto debería servir un audio real
  return NextResponse.json({
    id: musicId,
    url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,
    type: 'audio/mpeg',
    duration: 60,
    message: 'Audio mock - En desarrollo, usar audio real en producción'
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

