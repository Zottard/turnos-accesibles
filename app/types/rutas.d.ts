import type { Database } from './database'

declare module '#app' {
  interface PageMeta {
    roles?: Database['public']['Enums']['rol'][]
  }
}

export {}
