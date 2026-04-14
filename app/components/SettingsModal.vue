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
          Streamer.bot Settings
        </h2>
      </div>

      <UForm
        :validate="validateForm"
        :state="formData"
        class="p-6 space-y-4"
        @submit="onSave"
      >
        <!-- Host Setting -->
        <UFormField
          label="Host"
          name="host"
        >
          <UInput
            v-model="formData.host"
            type="text"
            placeholder="e.g., 10.0.0.95"
            required
            class="w-full"
          />
        </UFormField>

        <!-- Port Setting -->
        <UFormField
          label="Port"
          name="port"
        >
          <UInput
            v-model.number="formData.port"
            type="number"
            placeholder="e.g., 8080"
            min="1"
            max="65535"
            required
            class="w-full"
          />
        </UFormField>

        <!-- Messages Position Setting -->
        <UFormField
          label="Messages on Top"
          name="messagesOnTop"
          orientation="horizontal"
        >
          <USwitch v-model="formData.messagesOnTop" />
        </UFormField>

        <!-- Info Text -->
        <div class="text-xs text-slate-400 p-3 bg-slate-800 rounded-lg">
          Make sure Streamer.bot's WebSocket Server is accessible at this address.
        </div>

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
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

interface Props {
  modelValue: boolean
  host: string
  port: number
  messagesOnTop: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: { host: string, port: number, messagesOnTop: boolean }): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  host: '10.0.0.95',
  port: 8080,
  messagesOnTop: false
})

const emit = defineEmits<Emits>()

const formData = reactive({
  host: props.host,
  port: props.port,
  messagesOnTop: props.messagesOnTop
})

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      formData.host = props.host
      formData.port = props.port
      formData.messagesOnTop = props.messagesOnTop
    }
  }
)

function validateForm(state: Partial<{ host: string, port: number, messagesOnTop: boolean }>): FormError[] {
  const errors = []
  if (!state.host || !state.host.trim()) {
    errors.push({ name: 'host', message: 'Host is required' })
  }
  if (!state.port || state.port < 1 || state.port > 65535) {
    errors.push({ name: 'port', message: 'Port must be between 1 and 65535' })
  }
  return errors
}

function onSave(event: FormSubmitEvent<{ host: string, port: number, messagesOnTop: boolean }>) {
  emit('save', {
    host: event.data.host.trim(),
    port: event.data.port,
    messagesOnTop: event.data.messagesOnTop
  })
  isOpen.value = false
}

function onClose() {
  isOpen.value = false
}
</script>
