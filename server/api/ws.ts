import { getStreamerbot } from '../utils/streamerbot'

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
  },

  close(peer) {
    clients.delete(peer)
  },

  error(peer) {
    clients.delete(peer)
  }
})
