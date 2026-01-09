import { ReferenceImage } from '@/types/visual-research'

// ============================================
// SERVICIO DE BÚSQUEDA DE IMÁGENES
// ============================================

export interface ImageSearchResult {
  url: string
  thumbnail: string
  title: string
  source: string
  width: number
  height: number
}

/**
 * Buscar imágenes de una ubicación
 */
export async function searchLocationImages(
  location: string,
  options: {
    num_images?: number
    specific_queries?: string[]
  } = {}
): Promise<ImageSearchResult[]> {
  const { num_images = 30, specific_queries = [] } = options
  
  const allResults: ImageSearchResult[] = []
  
  // Queries base para la ubicación
  const baseQueries = [
    location,
    `${location} panoramic view`,
    `${location} street view`,
    `${location} aerial view`,
    `${location} landmarks`,
    `${location} architecture`,
    `${location} day`,
    `${location} night`,
    `${location} sunset`,
  ]
  
  // Añadir queries específicos
  const queries = [...baseQueries, ...specific_queries]
  
  // Buscar en múltiples fuentes
  for (const query of queries) {
    try {
      // Unsplash (alta calidad, gratis)
      if (process.env.UNSPLASH_ACCESS_KEY) {
        const unsplashResults = await searchUnsplash(query, 5)
        allResults.push(...unsplashResults)
      }
      
      // Pexels (alta calidad, gratis)
      if (process.env.PEXELS_API_KEY) {
        const pexelsResults = await searchPexels(query, 5)
        allResults.push(...pexelsResults)
      }
      
    } catch (error) {
      console.error(`Error searching for "${query}":`, error)
    }
  }
  
  // Eliminar duplicados por URL
  const uniqueResults = Array.from(
    new Map(allResults.map(img => [img.url, img])).values()
  )
  
  // Limitar cantidad
  return uniqueResults.slice(0, num_images)
}

/**
 * Buscar en Unsplash
 */
async function searchUnsplash(query: string, perPage: number): Promise<ImageSearchResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  
  if (!accessKey) {
    console.warn('UNSPLASH_ACCESS_KEY no configurado')
    return []
  }
  
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return (data.results || []).map((img: any) => ({
      url: img.urls?.regular || img.urls?.full || '',
      thumbnail: img.urls?.thumb || img.urls?.small || '',
      title: img.description || img.alt_description || query,
      source: 'unsplash',
      width: img.width || 0,
      height: img.height || 0
    })).filter((img: ImageSearchResult) => img.url)
  } catch (error) {
    console.error('Error searching Unsplash:', error)
    return []
  }
}

/**
 * Buscar en Pexels
 */
async function searchPexels(query: string, perPage: number): Promise<ImageSearchResult[]> {
  const apiKey = process.env.PEXELS_API_KEY
  
  if (!apiKey) {
    console.warn('PEXELS_API_KEY no configurado')
    return []
  }
  
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': apiKey
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return (data.photos || []).map((img: any) => ({
      url: img.src?.large || img.src?.original || '',
      thumbnail: img.src?.tiny || img.src?.small || '',
      title: img.alt || query,
      source: 'pexels',
      width: img.width || 0,
      height: img.height || 0
    })).filter((img: ImageSearchResult) => img.url)
  } catch (error) {
    console.error('Error searching Pexels:', error)
    return []
  }
}

/**
 * Buscar imágenes de Street View
 */
export async function getStreetViewImages(
  location: string,
  numImages: number = 5
): Promise<ImageSearchResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY no configurado')
    return []
  }
  
  try {
    // Primero geocodificar la ubicación
    const geocodeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
    )
    
    if (!geocodeResponse.ok) {
      throw new Error('Geocoding failed')
    }
    
    const geocodeData = await geocodeResponse.json()
    
    if (!geocodeData.results?.[0]) {
      return []
    }
    
    const { lat, lng } = geocodeData.results[0].geometry.location
    
    // Generar múltiples ángulos
    const headings = [0, 90, 180, 270, 45, 135, 225, 315]
    const results: ImageSearchResult[] = []
    
    for (const heading of headings.slice(0, numImages)) {
      const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${lat},${lng}&heading=${heading}&pitch=0&key=${apiKey}`
      
      results.push({
        url: streetViewUrl,
        thumbnail: streetViewUrl.replace('800x600', '200x150'),
        title: `Street View ${location} - ${heading}°`,
        source: 'streetview',
        width: 800,
        height: 600
      })
    }
    
    return results
  } catch (error) {
    console.error('Error getting Street View images:', error)
    return []
  }
}

/**
 * Obtener imágenes de Wikipedia
 */
export async function getWikipediaImages(
  topic: string,
  language: string = 'es'
): Promise<ImageSearchResult[]> {
  try {
    // Buscar el artículo
    const searchUrl = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`
    
    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()
    
    if (!searchData.query?.search?.[0]) {
      return []
    }
    
    const pageTitle = searchData.query.search[0].title
    
    // Obtener imágenes del artículo
    const imagesUrl = `https://${language}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&format=json&origin=*`
    
    const imagesResponse = await fetch(imagesUrl)
    const imagesData = await imagesResponse.json()
    
    const pages = Object.values(imagesData.query?.pages || {}) as any[]
    const imageNames = pages[0]?.images?.map((img: any) => img.title) || []
    
    // Obtener URLs de las imágenes
    const results: ImageSearchResult[] = []
    
    for (const imageName of imageNames.slice(0, 10)) {
      // Filtrar SVGs y archivos pequeños
      if (imageName.includes('.svg') || imageName.includes('Icon')) {
        continue
      }
      
      const infoUrl = `https://${language}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageName)}&prop=imageinfo&iiprop=url|size&format=json&origin=*`
      
      try {
        const infoResponse = await fetch(infoUrl)
        const infoData = await infoResponse.json()
        
        const infoPages = Object.values(infoData.query?.pages || {}) as any[]
        const imageInfo = infoPages[0]?.imageinfo?.[0]
        
        if (imageInfo?.url) {
          results.push({
            url: imageInfo.url,
            thumbnail: imageInfo.url,
            title: imageName.replace('Archivo:', '').replace('File:', ''),
            source: 'wikipedia',
            width: imageInfo.width || 0,
            height: imageInfo.height || 0
          })
        }
      } catch (error) {
        // Continuar con la siguiente imagen si hay error
        continue
      }
    }
    
    return results
  } catch (error) {
    console.error('Error getting Wikipedia images:', error)
    return []
  }
}

