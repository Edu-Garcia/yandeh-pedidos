<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useOnlineStore } from '@/stores/online'

const connection = useOnlineStore()
let stopOnline: (() => void) | undefined

onMounted(() => {
  stopOnline = connection.listen()
})

onUnmounted(() => {
  stopOnline?.()
})
</script>

<template>
  <div class="min-h-dvh bg-floor font-sans text-counter antialiased">
    <RouterView />
  </div>
</template>
