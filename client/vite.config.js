import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development /api is proxied to the local Express server (server/, port 8080).
// In production the client calls VITE_API_URL (the Render service) directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'node',
  },
});
