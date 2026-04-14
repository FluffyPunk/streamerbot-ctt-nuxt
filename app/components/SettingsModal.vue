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

      <!-- Content -->
      <div class="p-6 space-y-4">
        <!-- Host Setting -->
        <div>
          <label class="block text-sm font-semibold text-slate-200 mb-2">
            Host
          </label>
          <input
            v-model="formData.host"
            type="text"
            placeholder="e.g., 10.0.0.95"
            class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          >
        </div>

        <!-- Port Setting -->
        <div>
          <label class="block text-sm font-semibold text-slate-200 mb-2">
            Port
          </label>
          <input
            v-model.number="formData.port"
            type="number"
            placeholder="e.g., 8080"
            min="1"
            max="65535"
            class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          >
        </div>

        <!-- Info Text -->
        <div class="text-xs text-slate-400 p-3 bg-slate-800 rounded-lg">
          Make sure Streamer.bot's WebSocket Server is accessible at this address.
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-slate-700 px-6 py-4 flex gap-3 justify-end">
        <button
          class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          @click="onClose"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          @click="onSave"
        >
          Save Settings
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  host: string
  port: number
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: { host: string, port: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  host: '10.0.0.95',
  port: 8080
})

const emit = defineEmits<Emits>()

const formData = ref({
  host: props.host,
  port: props.port
})

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      formData.value.host = props.host
      formData.value.port = props.port
    }
  }
)

function onSave() {
  if (formData.value.host.trim() && formData.value.port > 0) {
    emit('save', {
      host: formData.value.host.trim(),
      port: formData.value.port
    })
    isOpen.value = false
  }
}

function onClose() {
  isOpen.value = false
}
</script>
