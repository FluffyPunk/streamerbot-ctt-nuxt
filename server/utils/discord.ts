interface DiscordWebhookPayload {
  content?: string
  embeds?: Array<{
    title?: string
    url?: string
    description?: string
    color?: number
    fields?: Array<{
      name: string
      value: string
      inline?: boolean
    }>
    thumbnail?: { url: string }
    image?: { url: string }
    footer?: {
      text: string
      icon_url?: string
    }
    timestamp?: string
  }>
}

interface StreamNotificationInfo {
  displayName: string
  login?: string
  channelId?: string
  profileImageUrl?: string
  startedAt?: string
}

interface DiscordConfig {
  webhookUrl: string
  platform: 'Twitch' | 'YouTube'
}

const discordConfig: DiscordConfig = {
  webhookUrl: '',
  platform: 'Twitch'
}

export function getDiscordConfig(): DiscordConfig {
  return discordConfig
}

export function setDiscordConfig(url: string, platform: 'Twitch' | 'YouTube') {
  discordConfig.webhookUrl = url.trim()
  discordConfig.platform = platform
}

export async function sendDiscordNotification(
  platform: 'Twitch' | 'YouTube',
  info: StreamNotificationInfo
): Promise<void> {
  if (!discordConfig.webhookUrl) {
    console.log('[discord] Webhook URL not configured')
    return
  }

  if (platform !== discordConfig.platform) {
    console.log(`[discord] ${platform} notifications disabled (platform mismatch)`)
    return
  }

  let streamUrl: string
  let previewImageUrl: string | undefined

  if (platform === 'Twitch') {
    const login = (info.login || info.displayName).toLowerCase()
    streamUrl = `https://twitch.tv/${login}`
    previewImageUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login}-440x248.jpg`
  } else {
    streamUrl = info.channelId
      ? `https://www.youtube.com/channel/${info.channelId}`
      : `https://www.youtube.com/@${info.login || info.displayName}`
  }

  const payload: DiscordWebhookPayload = {
    embeds: [
      {
        title: `🔴 ${info.displayName} is now live!`,
        url: streamUrl,
        color: platform === 'Twitch' ? 0x9146ff : 0xff0000,
        fields: [
          {
            name: platform === 'Twitch' ? 'Twitch' : 'YouTube',
            value: `[Watch stream](${streamUrl})`,
            inline: true
          }
        ],
        ...(info.profileImageUrl ? { thumbnail: { url: info.profileImageUrl } } : {}),
        ...(previewImageUrl ? { image: { url: previewImageUrl } } : {}),
        timestamp: info.startedAt || new Date().toISOString()
      }
    ]
  }

  try {
    const response = await fetch(discordConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('[discord] Failed to send notification:', response.status, response.statusText)
    } else {
      console.log('[discord] Notification sent successfully')
    }
  } catch (err) {
    console.error('[discord] Error sending notification:', err)
  }
}
