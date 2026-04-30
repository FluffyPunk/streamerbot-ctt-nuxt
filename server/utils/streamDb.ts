import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'

// Inline types — server code cannot import from the app layer
export interface StoredBadge {
  name?: string
  imageUrl?: string
}

export interface StoredMessage {
  messageId: string
  displayName: string
  color: string
  text: string
  badges: StoredBadge[]
  emotes: unknown[]
  time: string
  timestamp: number
  mention?: boolean
  reply?: { userName: string, msgBody: string }
}

export interface StoredEvent {
  source: string
  type: string
  name: string
  value?: string
  message?: string
}

export interface StreamSession {
  streamId: string
  startedAt: string
  twitchMessages: StoredMessage[]
  youtubeMessages: StoredMessage[]
  events: StoredEvent[]
}

const DATA_DIR = resolve(process.cwd(), 'data/streams')
const CURRENT_FILE = resolve(process.cwd(), 'data/current.json')

const MAX_MESSAGES_PER_SOURCE = 200
const MAX_EVENTS = 100

let currentStreamId: string | null = null

// Serialize all write operations to prevent race condition data loss
let writeQueue: Promise<void> = Promise.resolve()
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(() => fn())
  writeQueue = result.then(() => {}, () => {})
  return result
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

function sessionPath(streamId: string): string {
  return join(DATA_DIR, `${sanitizeId(streamId)}.json`)
}

async function readSession(streamId: string): Promise<StreamSession | null> {
  try {
    const raw = await fs.readFile(sessionPath(streamId), 'utf-8')
    return JSON.parse(raw) as StreamSession
  } catch {
    return null
  }
}

async function writeSession(session: StreamSession): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(sessionPath(session.streamId), JSON.stringify(session, null, 2), 'utf-8')
}

// Internal version — must only be called from within an enqueue callback
async function startStreamInternal(streamId: string): Promise<void> {
  currentStreamId = streamId
  await ensureDataDir()
  await fs.writeFile(CURRENT_FILE, JSON.stringify({ streamId }), 'utf-8')
  const existing = await readSession(streamId)
  if (!existing) {
    await writeSession({
      streamId,
      startedAt: new Date().toISOString(),
      twitchMessages: [],
      youtubeMessages: [],
      events: []
    })
  }
  console.log(`[streamDb] Stream session: ${streamId}`)
}

// Internal version — must only be called from within an enqueue callback
async function ensureCurrentStreamInternal(): Promise<void> {
  if (currentStreamId) return
  const fallbackId = `session_${new Date().toISOString().slice(0, 10)}`
  await startStreamInternal(fallbackId)
}

// --- Public API ---

export async function initStreamDb(): Promise<void> {
  try {
    const raw = await fs.readFile(CURRENT_FILE, 'utf-8')
    const obj = JSON.parse(raw)
    currentStreamId = obj.streamId || null
  } catch {
    currentStreamId = null
  }
}

export async function startNewStream(streamId: string): Promise<void> {
  return enqueue(() => startStreamInternal(streamId))
}

export function getCurrentStreamId(): string | null {
  return currentStreamId
}

export async function getCurrentStreamData(): Promise<StreamSession | null> {
  if (!currentStreamId) return null
  return readSession(currentStreamId)
}

export async function appendTwitchMessage(message: StoredMessage): Promise<void> {
  return enqueue(async () => {
    await ensureCurrentStreamInternal()
    const session = await readSession(currentStreamId!) || {
      streamId: currentStreamId!,
      startedAt: new Date().toISOString(),
      twitchMessages: [],
      youtubeMessages: [],
      events: []
    }
    if (session.twitchMessages.some(m => m.messageId === message.messageId)) return
    session.twitchMessages.unshift(message)
    if (session.twitchMessages.length > MAX_MESSAGES_PER_SOURCE) {
      session.twitchMessages = session.twitchMessages.slice(0, MAX_MESSAGES_PER_SOURCE)
    }
    await writeSession(session)
  })
}

export async function appendYouTubeMessage(message: StoredMessage): Promise<void> {
  return enqueue(async () => {
    await ensureCurrentStreamInternal()
    const session = await readSession(currentStreamId!) || {
      streamId: currentStreamId!,
      startedAt: new Date().toISOString(),
      twitchMessages: [],
      youtubeMessages: [],
      events: []
    }
    if (session.youtubeMessages.some(m => m.messageId === message.messageId)) return
    session.youtubeMessages.unshift(message)
    if (session.youtubeMessages.length > MAX_MESSAGES_PER_SOURCE) {
      session.youtubeMessages = session.youtubeMessages.slice(0, MAX_MESSAGES_PER_SOURCE)
    }
    await writeSession(session)
  })
}

export async function removeTwitchMessage(messageId: string): Promise<void> {
  if (!currentStreamId) return
  return enqueue(async () => {
    const session = await readSession(currentStreamId!)
    if (!session) return
    session.twitchMessages = session.twitchMessages.filter(m => m.messageId !== messageId)
    await writeSession(session)
  })
}

export async function purgeTwitchUser(username: string): Promise<void> {
  if (!currentStreamId) return
  return enqueue(async () => {
    const session = await readSession(currentStreamId!)
    if (!session) return
    const lower = username.toLowerCase()
    session.twitchMessages = session.twitchMessages.filter(m => m.displayName.toLowerCase() !== lower)
    await writeSession(session)
  })
}

export async function purgeYouTubeUser(username: string): Promise<void> {
  if (!currentStreamId) return
  return enqueue(async () => {
    const session = await readSession(currentStreamId!)
    if (!session) return
    const lower = username.toLowerCase()
    session.youtubeMessages = session.youtubeMessages.filter(m => m.displayName.toLowerCase() !== lower)
    await writeSession(session)
  })
}

export async function appendEvent(event: StoredEvent): Promise<void> {
  return enqueue(async () => {
    await ensureCurrentStreamInternal()
    const session = await readSession(currentStreamId!) || {
      streamId: currentStreamId!,
      startedAt: new Date().toISOString(),
      twitchMessages: [],
      youtubeMessages: [],
      events: []
    }
    session.events.unshift(event)
    if (session.events.length > MAX_EVENTS) {
      session.events = session.events.slice(0, MAX_EVENTS)
    }
    await writeSession(session)
  })
}
