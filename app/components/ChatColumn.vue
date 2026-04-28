<template>
  <div :class="['flex-1 flex flex-col', borderRight ? 'border-r border-slate-800' : '']">
    <div class="column-header">
      <component
        :is="icon"
        class="w-3.5 h-3.5"
      />
      <span>{{ label }}</span>
    </div>
    <div
      ref="scrollRef"
      :class="['flex-1 overflow-y-auto flex gap-2 p-3', messagesOnTop ? 'flex-col' : 'flex-col-reverse']"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'

defineProps<{
  icon: Component
  label: string
  messagesOnTop: boolean
  borderRight?: boolean
}>()

const scrollRef = ref<HTMLElement>()
defineExpose({ scrollRef })
</script>
