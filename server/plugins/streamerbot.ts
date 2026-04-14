import { initStreamerbot } from '../utils/streamerbot'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const host = config.streamerbotHost || '10.0.0.95'
  const port = Number(config.streamerbotPort) || 8080

  console.log(`[streamerbot] Connecting to ${host}:${port}`)
  initStreamerbot(host, port)
})
