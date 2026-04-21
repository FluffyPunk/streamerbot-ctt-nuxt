import { getStreamerbot, setStreamerbotConfig } from '../utils/streamerbot'

interface StreamerbotConfigBody {
  host?: string
  port?: number | string
}

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    const sb = getStreamerbot()
    return {
      host: sb.host,
      port: sb.port,
      status: sb.status
    }
  }

  if (event.method === 'POST') {
    const body = await readBody<StreamerbotConfigBody>(event)
    const host = String(body?.host || '').trim()
    const parsedPort = Number(body?.port)

    if (!host) {
      throw createError({ statusCode: 400, statusMessage: 'Host is required' })
    }

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      throw createError({ statusCode: 400, statusMessage: 'Port must be an integer between 1 and 65535' })
    }

    setStreamerbotConfig(host, parsedPort)

    return {
      ok: true,
      host,
      port: parsedPort
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
