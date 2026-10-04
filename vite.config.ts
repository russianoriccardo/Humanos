import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// VITE_BASE lets the same build run at the domain root (Netlify, local dev) or under a sub-path
// (GitHub Pages serves the app at /<repo>/app/). Defaults to the root.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
