import { StreamerbotClient } from '@streamerbot/client'
import { broadcastToClients } from '../api/ws'

interface StreamerbotState {
  client: StreamerbotClient | null
  status: 'connecting' | 'connected' | 'disconnected'
  broadcaster: unknown | null
}

const state: StreamerbotState = {
  client: null,
  status: 'disconnected',
  broadcaster: null
}

export function getStreamerbot() {
  return state
}

function broadcast(type: string, payload: unknown) {
  broadcastToClients(JSON.stringify({ type, ...payload as Record<string, unknown> }))
}

function broadcastStatus() {
  broadcastToClients(JSON.stringify({ type: 'status', status: state.status }))
}

export function initStreamerbot(host: string, port: number) {
  if (state.client) {
    try { state.client.disconnect() } catch { /* ignore */ }
    state.client = null
  }

  state.status = 'connecting'
  broadcastStatus()

  const client = new StreamerbotClient({
    host,
    port,
    password: '',
    immediate: false,
    autoReconnect: true,
    onConnect: async () => {
      state.status = 'connected'
      broadcastStatus()

      try {
        const broadcaster = await client.getBroadcaster()
        state.broadcaster = broadcaster
        broadcastToClients(JSON.stringify({ type: 'broadcaster', data: broadcaster }))
      } catch (err) {
        console.error('[streamerbot] Failed to get broadcaster info:', err)
      }
    },
    onDisconnect: () => {
      state.status = 'disconnected'
      broadcastStatus()
    },
    onError: () => {
      state.status = 'disconnected'
      broadcastStatus()
    }
  })

  // Subscribe to all events and relay them via wildcards
  client.on('Twitch.*', (e) => {
    broadcast('event', { event: e.event, data: e.data })
  })

  client.on('YouTube.*', (e) => {
    broadcast('event', { event: e.event, data: e.data })
  })

  client.connect(30000).catch(() => {
    state.status = 'disconnected'
    broadcastStatus()
  })

  state.client = client
}
