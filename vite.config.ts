import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 12000,
    strictPort: false,
    allowedHosts: ['.prod-runtime.all-hands.dev', 'localhost'],
  },
  preview: { host: '0.0.0.0', port: 12000, allowedHosts: ['.prod-runtime.all-hands.dev', 'localhost'] },
});
