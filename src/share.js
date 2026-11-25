const endpoint = '/api/gift'
const MAX_PHOTO_CHARS = 900 * 1024

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file) } catch {}
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressPhoto(file, max = 1440, quality = .82) {
  const source = await loadBitmap(file)
  const width = source.width || source.naturalWidth
  const height = source.height || source.naturalHeight
  const ratio = Math.min(1, max / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * ratio))
  canvas.height = Math.max(1, Math.round(height * ratio))
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()
  let data = canvas.toDataURL('image/webp', quality)
  if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', quality)
  return data
}

export async function createShareLink({ name, message, removed, photos, onProgress }) {
  if (location.protocol === 'file:') throw new Error('unavailable')
  const payloadPhotos = []
  for (let index = 0; index < photos.length; index++) {
    const item = photos[index]
    if (!item.blob) continue
    const data = await compressPhoto(item.blob)
    if (data.length > MAX_PHOTO_CHARS) throw new Error('photo-too-large')
    payloadPhotos.push({ name: item.name, data })
    onProgress?.(index + 1, photos.length)
  }

  const body = JSON.stringify({ name, message, removed, photos: payloadPhotos })
  if (body.length > 5 * 1024 * 1024) throw new Error('too-large')

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
  } catch {
    throw new Error('network')
  }
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) throw new Error('unavailable')
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'failed')
  return { id: result.id, url: `${location.origin}${location.pathname}?gift=${result.id}` }
}

export async function loadGift(id) {
  if (location.protocol === 'file:') throw new Error('unavailable')
  let response
  try {
    response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`)
  } catch {
    throw new Error('network')
  }
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) throw new Error('unavailable')
  const result = await response.json().catch(() => ({}))
  if (response.status === 404) throw new Error('not-found')
  if (response.status === 410) throw new Error('expired')
  if (!response.ok) throw new Error(result.error || 'failed')
  return result
}
