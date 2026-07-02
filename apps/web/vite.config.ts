import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { loadConfigFromFile } from 'vite'

const overrides = {
  root: '.',
  base: '/meowdoku-clone/',
  resolve: { alias: { '@': path.resolve(__dirname, '../src'), '@game': path.resolve(__dirname, '../lib/gameengine') } },
  publicDir: '../../public',
  plugins: [react()],
}

const baseConfig = await loadConfigFromFile({ path: path.resolve(__dirname, '../../vite.config.ts') }).then(r => r?.config).catch(() => ({}));
export default defineConfig({ ...baseConfig, ...overrides })
