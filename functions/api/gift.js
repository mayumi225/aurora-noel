const TTL = 30 * 24 * 60 * 60 * 1000
const MAX_BODY = 6 * 1024 * 1024
const MAX_AUDIO = 8 * 1024 * 1024

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

const makeId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16)
const jsonKey = id => `gift:${id}:json`
const audioKey = id => `gift:${id}:audio`

export async function onRequest(context) {
  const { request, env } = context
  const store = env.GIFTS_KV
  if (!store) return json(500, { error: 'no-storage' })

  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''

  if (request.method === 'POST') {
    const length = Number(request.headers.get('content-length') || 0)
    if (length > MAX_BODY) return json(413, { error: 'too-large' })
    const newId = makeId()
    await store.put(jsonKey(newId), request.body, {
      metadata: { createdAt: Date.now(), type: 'application/json' },
    })
    return json(200, { id: newId })
  }

  if (!/^[a-f0-9]{16}$/.test(id)) return json(400, { error: 'bad-id' })

  if (request.method === 'GET') {
    const audio = url.searchParams.get('audio') === '1'
    const key = audio ? audioKey(id) : jsonKey(id)
    const entry = await store.getWithMetadata(key, 'stream')
    if (!entry?.value) return json(404, { error: audio ? 'audio-not-found' : 'not-found' })
    const createdAt = Number(entry.metadata?.createdAt || 0)
    if (createdAt && Date.now() - createdAt > TTL) {
      await store.delete(key)
      return json(410, { error: 'expired' })
    }
    return new Response(entry.value, {
      headers: {
        'content-type': entry.metadata?.type || (audio ? 'audio/mpeg' : 'application/json'),
        'cache-control': audio ? 'public, max-age=86400' : 'no-store',
      },
    })
  }

  if (request.method === 'PUT') {
    const type = request.headers.get('content-type') || ''
    if (!/^audio\//.test(type)) return json(415, { error: 'bad-audio' })
    const length = Number(request.headers.get('content-length') || 0)
    if (length > MAX_AUDIO) return json(413, { error: 'audio-too-large' })
    await store.put(audioKey(id), request.body, {
      metadata: { createdAt: Date.now(), type },
    })
    return json(200, { ok: true })
  }

  if (request.method === 'DELETE') {
    await store.delete(jsonKey(id))
    await store.delete(audioKey(id))
    return json(200, { ok: true })
  }

  return json(405, { error: 'method' })
}
