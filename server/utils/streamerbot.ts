import { StreamerbotClient } from '@streamerbot/client'
import { broadcastToClients } from '../api/ws'
import { sendDiscordNotification } from './discord'

interface StreamerbotState {
  client: StreamerbotClient | null
  status: 'connecting' | 'connected' | 'disconnected'
  broadcaster: unknown | null
  host: string
  port: number
}

const state: StreamerbotState = {
  client: null,
  status: 'disconnected',
  broadcaster: null,
  host: '127.0.0.1',
  port: 8080
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
  state.host = host
  state.port = port

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
    console.log(e)

    // Handle Twitch stream online
    const eventName = String(e.event.type)
    if (eventName === 'StreamOnline') {
      const eventData = e.data as Record<string, unknown>
      const b = state.broadcaster as { platforms?: { twitch?: { broadcastUser: string, broadcastUserName: string } } } | null

      sendDiscordNotification('Twitch', {
        displayName: b?.platforms?.twitch?.broadcastUser || 'Unknown',
        login: b?.platforms?.twitch?.broadcastUserName,
        startedAt: eventData?.started_at as string | undefined
      }).catch((err) => {
        console.error('[streamerbot] Failed to send Discord notification:', err)
      })
    }
  })

  client.on('YouTube.*', (e) => {
    broadcast('event', { event: e.event, data: e.data })

    // Handle YouTube stream online
    const eventName = String(e.event.type)
    if (eventName === 'BroadcastStarted') {
      const b = state.broadcaster as { platforms?: { youtube?: { broadcastUserName: string, broadcastUserId: string, broadcastUserProfileImage: string } } } | null

      sendDiscordNotification('YouTube', {
        displayName: b?.platforms?.youtube?.broadcastUserName || 'Unknown',
        login: b?.platforms?.youtube?.broadcastUserName,
        channelId: b?.platforms?.youtube?.broadcastUserId,
        profileImageUrl: b?.platforms?.youtube?.broadcastUserProfileImage
      }).catch((err) => {
        console.error('[streamerbot] Failed to send Discord notification:', err)
      })
    }
  })

  client.connect(30000).catch(() => {
    state.status = 'disconnected'
    broadcastStatus()
  })

  state.client = client
}

export function setStreamerbotConfig(host: string, port: number) {
  initStreamerbot(host, port)
}
