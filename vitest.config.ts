import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Tests de la lógica del juego (sin navegador): reglas, ejercicios generados,
// relevo del 2 vs 2, ítems. Correr con `pnpm test`.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
