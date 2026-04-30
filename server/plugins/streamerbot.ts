import { initStreamerbot } from '../utils/streamerbot'
import { initStreamDb } from '../utils/streamDb'

export default defineNitroPlugin(async () => {
  await initStreamDb()

  const config = useRuntimeConfig()
  const host = config.streamerbotHost || '10.0.0.95'
  const port = Number(config.streamerbotPort) || 8080

  console.log(`[streamerbot] Connecting to ${host}:${port}`)
  initStreamerbot(host, port)
})
