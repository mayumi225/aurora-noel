import { getStore } from '@netlify/blobs'

const MAX_PHOTOS = 8
const MAX_PHOTO_CHARS = 900 * 1024
const MAX_BODY_CHARS = 5 * 1024 * 1024
const TTL = 90 * 24 * 60 * 60 * 1000

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

function makeId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

export default async (request) => {
  const store = getStore({ name: 'gifts', consistency: 'strong' })
  const { searchParams } = new URL(request.url)

  if (request.method === 'GET') {
    const id = searchParams.get('id') || ''
    if (!/^[a-f0-9]{16}$/.test(id)) return json(400, { error: 'bad-id' })
    const gift = await store.get(id, { type: 'json' }).catch(() => null)
    if (!gift) return json(404, { error: 'not-found' })
    if (Date.now() - (gift.createdAt || 0) > TTL) {
      await store.delete(id).catch(() => {})
      return json(410, { error: 'expired' })
    }
    return json(200, gift)
  }

  if (request.method !== 'POST') return json(405, { error: 'method' })

  let data
  try { data = await request.json() } catch { return json(400, { error: 'bad-json' }) }

  const name = String(data?.name || '').trim().slice(0, 24)
  const message = String(data?.message || '').trim().slice(0, 80)
  const removed = Array.isArray(data?.removed)
    ? data.removed.filter(item => typeof item === 'string' && item.length < 40).slice(0, 16)
    : []
  const photos = Array.isArray(data?.photos) ? data.photos.slice(0, MAX_PHOTOS) : []
  const validPhoto = photo => typeof photo?.data === 'string'
    && /^data:image\/(webp|jpeg|png);base64,/.test(photo.data)
    && photo.data.length <= MAX_PHOTO_CHARS
  if (!photos.every(validPhoto)) return json(413, { error: 'photo-too-large' })

  const payload = {
    v: 1,
    name,
    message,
    removed,
    photos: photos.map(photo => ({
      name: String(photo.name || 'photo').slice(0, 60),
      data: photo.data,
    })),
    createdAt: Date.now(),
  }
  if (JSON.stringify(payload).length > MAX_BODY_CHARS) return json(413, { error: 'too-large' })

  const id = makeId()
  await store.setJSON(id, payload)
  return json(200, { id })
}

export const config = { path: '/api/gift' }
