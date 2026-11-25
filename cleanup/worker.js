const RETENTION = 30 * 24 * 60 * 60 * 1000
const MAX_DELETES = 900

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanup(env))
  },
  async fetch() {
    return new Response('aurora-noel cleanup worker is running', { status: 200 })
  },
}

export async function cleanup(env, now = Date.now()) {
  const store = env.GIFTS_KV
  if (!store) return { scanned: 0, deleted: 0, error: 'no-storage' }
  const cutoff = now - RETENTION
  let cursor
  let scanned = 0
  let deleted = 0
  do {
    const page = await store.list({ prefix: 'gift:', cursor })
    scanned += page.keys.length
    for (const key of page.keys) {
      const createdAt = Number(key.metadata?.createdAt || 0)
      if (createdAt && createdAt < cutoff) {
        await store.delete(key.name)
        deleted++
        if (deleted >= MAX_DELETES) break
      }
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor && deleted < MAX_DELETES)
  return { scanned, deleted }
}
