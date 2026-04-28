import { getDiscordConfig, setDiscordConfig } from '../utils/discord'

interface DiscordConfigBody {
  webhookUrl?: string
  platform?: 'Twitch' | 'YouTube'
}

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    const config = getDiscordConfig()
    return {
      webhookUrl: config.webhookUrl,
      platform: config.platform
    }
  }

  if (event.method === 'POST') {
    const body = await readBody<DiscordConfigBody>(event)
    const webhookUrl = String(body?.webhookUrl || '').trim()
    const platform = body?.platform || 'Twitch'

    if (!webhookUrl) {
      throw createError({ statusCode: 400, statusMessage: 'Webhook URL is required' })
    }

    // Validate it's a Discord webhook URL
    if (!webhookUrl.includes('discord') || !webhookUrl.includes('webhook')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid Discord webhook URL' })
    }

    if (platform !== 'Twitch' && platform !== 'YouTube') {
      throw createError({ statusCode: 400, statusMessage: 'Platform must be Twitch or YouTube' })
    }

    setDiscordConfig(webhookUrl, platform)

    return {
      ok: true,
      webhookUrl,
      platform
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
