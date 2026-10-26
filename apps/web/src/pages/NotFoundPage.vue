<script setup lang="ts">
import SessionBar from '@/components/SessionBar.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
</script>

<template>
  <div class="min-h-dvh">
    <SessionBar />
    <section class="px-4 py-6">
      <h1 class="font-display text-3xl text-counter">Página não encontrada</h1>
      <p class="mt-3 max-w-prose font-sans text-base text-steel">Esse endereço não existe.</p>
      <RouterLink
        :to="{ name: session.homeRouteName }"
        class="mt-6 inline-block min-h-12 border-b-2 border-produce pt-2 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
      >
        Ir para o início
      </RouterLink>
    </section>
  </div>
</template>
