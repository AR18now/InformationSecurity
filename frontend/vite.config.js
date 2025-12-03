import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true, // Optional: To rewrite the target origin in the response headers
        secure: false, // Optional: If your target server uses a self-signed certificate
        ws: true // Optional: To proxy WebSocket connections
      }
    }
  }
});