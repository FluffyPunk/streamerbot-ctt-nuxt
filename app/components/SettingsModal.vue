<template>
  <!-- Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click="onClose"
  >
    <!-- Modal Dialog -->
    <div
      class="bg-slate-900 rounded-lg border border-slate-700 shadow-2xl max-w-md w-full"
      @click.stop
    >
      <!-- Header -->
      <div class="border-b border-slate-700 px-6 py-4">
        <h2 class="text-lg font-semibold text-slate-100">
          Application Settings
        </h2>
      </div>

      <UForm
        :state="formData"
        class="p-6 space-y-4"
        @submit="onSave"
      >
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          variant="link"
          :unmount-on-hide="false"
        />

        <div
          v-if="activeTab === 'streamerbot'"
          class="space-y-4"
        >
          <UFormField
            label="Streamer.bot Host"
            name="streamerbotHost"
            class="w-full"
          >
            <UInput
              v-model="formData.streamerbotHost"
              placeholder="127.0.0.1"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Streamer.bot Port"
            name="streamerbotPort"
            class="w-full"
          >
            <UInput
              v-model="formData.streamerbotPort"
              type="number"
              min="1"
              max="65535"
              placeholder="8080"
              class="w-full"
            />
          </UFormField>
        </div>

        <div
          v-else-if="activeTab === 'discord'"
          class="space-y-4"
        >
          <UFormField
            label="Discord Webhook URL"
            name="discordWebhookUrl"
            class="w-full"
          >
            <UInput
              v-model="formData.discordWebhookUrl"
              type="password"
              placeholder="https://discord.com/api/webhooks/..."
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Notify on Stream Online"
            name="discordPlatform"
          >
            <URadioGroup
              v-model="formData.discordPlatform"
              :items="[
                { value: 'Twitch', label: 'Twitch' },
                { value: 'YouTube', label: 'YouTube' }
              ]"
              orientation="horizontal"
              variant="table"
            />
          </UFormField>
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <UFormField
            label="Messages on Top"
            name="messagesOnTop"
            orientation="horizontal"
          >
            <USwitch v-model="formData.messagesOnTop" />
          </UFormField>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-700 -mx-6 -mb-6 px-6 py-4 flex gap-3 justify-end">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            @click="onClose"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
          >
            Save Settings
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, reactive, ref } from 'vue'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Props {
  modelValue?: boolean
  messagesOnTop?: boolean
  streamerbotHost?: string
  streamerbotPort?: string
  discordWebhookUrl?: string
  discordPlatform?: 'Twitch' | 'YouTube'
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: {
    messagesOnTop: boolean
    streamerbotHost: string
    streamerbotPort: string
    discordWebhookUrl: string
    discordPlatform: 'Twitch' | 'YouTube'
  }): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  messagesOnTop: false,
  streamerbotHost: '127.0.0.1',
  streamerbotPort: '8080',
  discordWebhookUrl: '',
  discordPlatform: 'Twitch'
})

const emit = defineEmits<Emits>()

const formData = reactive({
  messagesOnTop: props.messagesOnTop,
  streamerbotHost: props.streamerbotHost,
  streamerbotPort: props.streamerbotPort,
  discordWebhookUrl: props.discordWebhookUrl,
  discordPlatform: props.discordPlatform
})

const tabItems = [
  { label: 'Streamer.bot', value: 'streamerbot' },
  { label: 'Discord', value: 'discord' },
  { label: 'Visuals', value: 'visuals' }
]

const activeTab = ref<'streamerbot' | 'discord' | 'visuals'>('streamerbot')

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      formData.messagesOnTop = props.messagesOnTop
      formData.streamerbotHost = props.streamerbotHost
      formData.streamerbotPort = props.streamerbotPort
      formData.discordWebhookUrl = props.discordWebhookUrl
      formData.discordPlatform = props.discordPlatform
      activeTab.value = 'streamerbot'
    }
  }
)

function onSave(event: FormSubmitEvent<{
  messagesOnTop: boolean
  streamerbotHost: string
  streamerbotPort: string
  discordWebhookUrl: string
  discordPlatform: 'Twitch' | 'YouTube'
}>) {
  emit('save', {
    messagesOnTop: event.data.messagesOnTop,
    streamerbotHost: event.data.streamerbotHost.trim(),
    streamerbotPort: event.data.streamerbotPort.trim(),
    discordWebhookUrl: event.data.discordWebhookUrl.trim(),
    discordPlatform: event.data.discordPlatform
  })
  isOpen.value = false
}

function onClose() {
  isOpen.value = false
}
</script>
