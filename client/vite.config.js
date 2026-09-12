import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development (npm run dev inside client/), Vite serves the
// React app on its own port and proxies API calls to the Express backend
// (assumed running on :3000). In production, Express serves the built
// files directly from client/dist, so no proxy is involved at all.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
