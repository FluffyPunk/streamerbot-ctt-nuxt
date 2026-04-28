<template>
  <div class="h-8 bg-slate-900 border-b-2 border-slate-800 overflow-hidden shrink-0 flex items-center group">
    <div
      v-if="events.length"
      ref="tickerRef"
      class="flex items-center gap-6 whitespace-nowrap animate-ticker pl-full"
      :style="{
        animationDuration: tickerDuration + 's',
        animationPlayState: isPaused ? 'paused' : 'running'
      }"
      @mouseenter="isPaused = true"
      @mouseleave="isPaused = false"
    >
      <template
        v-for="(event, idx) in events"
        :key="idx"
      >
        <UTooltip
          v-if="event.message"
          :text="event.message"
        >
          <div
            :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 text-xs font-medium',
              event.source === 'Twitch'
                ? 'bg-slate-800 border-l-2 border-purple-500 text-slate-200'
                : 'bg-slate-800 border-l-2 border-red-500 text-slate-200'
            ]"
          >
            <span class="font-semibold">{{ event.name }}</span>
            <span class="text-slate-400">{{ event.type }}</span>
            <span
              v-if="event.value"
              class="text-slate-400"
            >{{ event.value }}</span>
          </div>
        </UTooltip>
        <div
          v-else
          :class="[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 text-xs font-medium',
            event.source === 'Twitch'
              ? 'bg-slate-800 border-l-2 border-purple-500 text-slate-200'
              : 'bg-slate-800 border-l-2 border-red-500 text-slate-200'
          ]"
        >
          <span class="font-semibold">{{ event.name }}</span>
          <span class="text-slate-400">{{ event.type }}</span>
          <span
            v-if="event.value"
            class="text-slate-400"
          >{{ event.value }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { EventItem } from '~/types/chat'

const props = defineProps<{
  events: EventItem[]
}>()

const tickerRef = ref<HTMLElement>()
const isPaused = ref(false)
const tickerDuration = ref(30)

const TICKER_PX_PER_SEC = 100

function updateTickerDuration() {
  if (!tickerRef.value) return
  nextTick(() => {
    if (!tickerRef.value) return
    const w = tickerRef.value.scrollWidth
    if (w === 0) return
    tickerDuration.value = Math.max(5, w / TICKER_PX_PER_SEC)
  })
}

watch(() => props.events, updateTickerDuration, { deep: true })
</script>
