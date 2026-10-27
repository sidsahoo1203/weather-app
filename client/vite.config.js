import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// During development /api is proxied to the local Express server (server/, port 8080).
// In production the client calls VITE_API_URL (the Render service) directly.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    // Tailwind v4 already targets modern browsers (Safari 16.4+, Chrome 111+), so skip
    // down-levelling the JavaScript for older ones.
    target: 'es2022',
  },
  test: {
    environment: 'node',
  },
});
