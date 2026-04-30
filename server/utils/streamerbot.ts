import { StreamerbotClient } from '@streamerbot/client'
import { broadcastToClients } from '../api/ws'
import {
  startNewStream,
  appendTwitchMessage,
  appendYouTubeMessage,
  removeTwitchMessage,
  purgeTwitchUser,
  purgeYouTubeUser,
  appendEvent
} from './streamDb'
import {
  parseTwitchMessage,
  parseYouTubeMessage,
  processTwitchTickerEvent,
  processYouTubeTickerEvent
} from './messageProcessor'

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

function getBroadcasterTwitchLogin(): string {
  const b = state.broadcaster as { platforms?: { twitch?: { broadcastUserName?: string } } } | null
  return b?.platforms?.twitch?.broadcastUserName?.toLowerCase() || ''
}

function broadcast(type: string, payload: unknown) {
  broadcastToClients(JSON.stringify({ type, ...payload as Record<string, unknown> }))
}

function broadcastStatus() {
  broadcastToClients(JSON.stringify({ type: 'status', status: state.status }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTwitchDbEvent(event: { type: string }, data: any): Promise<void> {
  switch (event.type) {
    case 'StreamOnline': {
      const broadcastId = data.id || 'unknown'
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      await startNewStream(`twitch_${broadcastId}_${date}`)
      break
    }
    case 'ChatMessage': {
      const msg = parseTwitchMessage(data, getBroadcasterTwitchLogin())
      if (msg) await appendTwitchMessage(msg)
      break
    }
    case 'UserBanned':
    case 'UserTimedOut': {
      const username = data.targetUser?.login
      if (username) await purgeTwitchUser(username)
      break
    }
    case 'ChatMessageDeleted': {
      const messageId = data.messageId
      if (messageId) await removeTwitchMessage(messageId)
      break
    }
    default: {
      const eventItem = processTwitchTickerEvent(event.type, data)
      if (eventItem) await appendEvent(eventItem)
      break
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleYouTubeDbEvent(event: { type: string }, data: any): Promise<void> {
  switch (event.type) {
    case 'Message': {
      const msg = parseYouTubeMessage(data)
      if (msg) await appendYouTubeMessage(msg)
      console.log('[streamDb] YouTube message appended:', msg)
      break
    }
    case 'UserBanned': {
      const bannedUser = data.bannedUser as { name?: string } | undefined
      if (bannedUser?.name) await purgeYouTubeUser(bannedUser.name)
      break
    }
    default: {
      const eventItem = processYouTubeTickerEvent(event.type, data)
      if (eventItem) await appendEvent(eventItem)
      break
    }
  }
}

export function initStreamerbot(host: string, port: number) {
  state.host = host
  state.port = port

  if (state.client) {
    try {
      state.client.disconnect()
    } catch { /* ignore */ }
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

  client.on('Twitch.*', (e) => {
    broadcast('event', { event: e.event, data: e.data })
    handleTwitchDbEvent(e.event, e.data).catch(err =>
      console.error('[streamDb] Twitch event error:', err)
    )
  })

  client.on('YouTube.*', (e) => {
    broadcast('event', { event: e.event, data: e.data })
    handleYouTubeDbEvent(e.event, e.data).catch(err =>
      console.error('[streamDb] YouTube event error:', err)
    )
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
