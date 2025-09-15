import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // слушать все интерфейсы, доступно с телефона
    port: 5173
  }
});