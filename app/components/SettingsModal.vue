<template>
  <!-- Backdrop -->
  <div
    v-if="isOpen"
    class="settings-backdrop"
    @click="onClose"
  >
    <!-- Modal Dialog -->
    <div
      class="settings-dialog"
      @click.stop
    >
      <!-- Header -->
      <div class="settings-dialog-header">
        <h2 class="settings-dialog-title">
          Application Settings
        </h2>
      </div>

      <UForm
        :state="formData"
        class="settings-dialog-body"
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
        <div class="settings-dialog-footer">
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
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: { messagesOnTop: boolean, streamerbotHost: string, streamerbotPort: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  messagesOnTop: false,
  streamerbotHost: '127.0.0.1',
  streamerbotPort: '8080'
})

const emit = defineEmits<Emits>()

const formData = reactive({
  messagesOnTop: props.messagesOnTop,
  streamerbotHost: props.streamerbotHost,
  streamerbotPort: props.streamerbotPort
})

const tabItems = [
  { label: 'Streamer.bot', value: 'streamerbot' },
  { label: 'Visuals', value: 'visuals' }
]

const activeTab = ref<'streamerbot' | 'visuals'>('streamerbot')

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
      activeTab.value = 'streamerbot'
    }
  }
)

function onSave(event: FormSubmitEvent<{ messagesOnTop: boolean, streamerbotHost: string, streamerbotPort: string }>) {
  emit('save', {
    messagesOnTop: event.data.messagesOnTop,
    streamerbotHost: event.data.streamerbotHost.trim(),
    streamerbotPort: event.data.streamerbotPort.trim()
  })
  isOpen.value = false
}

function onClose() {
  isOpen.value = false
}
</script>
