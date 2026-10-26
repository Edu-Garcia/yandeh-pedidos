import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    role?: 'seller' | 'supervisor'
  }
}
