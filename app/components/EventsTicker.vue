<template>
  <div class="events-ticker">
    <div
      v-if="events.length"
      ref="tickerRef"
      class="events-ticker-inner"
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
              'event-pill',
              event.source === 'Twitch' ? 'event-pill--twitch' : 'event-pill--youtube'
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
            'event-pill',
            event.source === 'Twitch' ? 'event-pill--twitch' : 'event-pill--youtube'
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
