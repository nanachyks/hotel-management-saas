import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Explicit IPv4 — 'localhost' can resolve to ::1, and if a stray Vite
        // instance ever binds [::1]:3001 the proxy would talk to itself.
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
