import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = fileURLToPath(new URL('../shared', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Types, stock and shipping rules shared with the server
  resolve: { alias: { '@shared': shared } },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5050' },
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), shared] },
  },
})
