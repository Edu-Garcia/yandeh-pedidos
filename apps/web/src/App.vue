<template>
  <div class="min-h-dvh bg-neutral-50 text-neutral-900">
    <header class="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
      <span class="font-semibold">Yandeh · Pedidos</span>
      <nav class="flex gap-3 text-sm">
        <RouterLink to="/">Vendedor</RouterLink>
        <RouterLink to="/clientes">Clientes</RouterLink>
        <RouterLink to="/supervisor">Aprovações</RouterLink>
      </nav>
    </header>
    <main class="mx-auto max-w-3xl p-4">
      <RouterView />
    </main>
  </div>
</template>
