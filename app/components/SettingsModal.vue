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
          Display Settings
        </h2>
      </div>

      <UForm
        :state="formData"
        class="p-6 space-y-4"
        @submit="onSave"
      >
        <!-- Messages Position Setting -->
        <UFormField
          label="Messages on Top"
          name="messagesOnTop"
          orientation="horizontal"
        >
          <USwitch v-model="formData.messagesOnTop" />
        </UFormField>

        <UFormField
          label="Streamer.bot Host"
          name="streamerbotHost"
        >
          <UInput
            v-model="formData.streamerbotHost"
            placeholder="127.0.0.1"
          />
        </UFormField>

        <UFormField
          label="Streamer.bot Port"
          name="streamerbotPort"
        >
          <UInput
            v-model="formData.streamerbotPort"
            type="number"
            min="1"
            max="65535"
            placeholder="8080"
          />
        </UFormField>

        <!-- Footer -->
        <div class="border-t border-slate-700 -mx-6 -mb-6 px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            @click="onClose"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            Save Settings
          </button>
        </div>
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, reactive } from 'vue'
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
