import { getStreamerbot } from '../utils/streamerbot'
import { getCurrentStreamData } from '../utils/streamDb'

const clients = new Set<{ send: (data: string) => void }>()

export function broadcastToClients(message: string) {
  for (const client of clients) {
    try {
      client.send(message)
    } catch {
      clients.delete(client)
    }
  }
}

export default defineWebSocketHandler({
  open(peer) {
    clients.add(peer)

    // Send current connection status
    const sb = getStreamerbot()
    peer.send(JSON.stringify({
      type: 'status',
      status: sb.status
    }))

    // Send cached broadcaster info if available
    if (sb.broadcaster) {
      peer.send(JSON.stringify({
        type: 'broadcaster',
        data: sb.broadcaster
      }))
    }

    // Send stored messages and events for page recovery
    getCurrentStreamData().then((data) => {
      if (!data) return
      peer.send(JSON.stringify({
        type: 'chat-history',
        twitchMessages: data.twitchMessages,
        youtubeMessages: data.youtubeMessages,
        events: data.events
      }))
    }).catch(() => {})
  },

  close(peer) {
    clients.delete(peer)
  },

  error(peer) {
    clients.delete(peer)
  }
})
