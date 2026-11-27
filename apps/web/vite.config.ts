import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import path from 'node:path';
import pkg from './package.json' with { type: 'json' };

const PORT = 8080;

export default defineConfig({
  envDir: import.meta.dirname,
  publicDir: path.resolve(import.meta.dirname, 'public'),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'build'),
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Stable vendor chunks so app deploys don't bust their cache.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
            },
            {
              name: 'router',
              test: /node_modules[\\/]react-router[\\/]/,
              priority: 30,
            },
            {
              name: 'data',
              test: /node_modules[\\/](@tanstack|react-query-kit|zustand|axios)[\\/]/,
              priority: 30,
            },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/,
              priority: 30,
            },
            {
              name: 'ui',
              test: /node_modules[\\/](radix-ui|@radix-ui|@floating-ui|cmdk|lucide-react|sonner|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: [
      {
        find: /^src\/(.+)/,
        replacement: path.resolve(import.meta.dirname, 'src/$1'),
      },
    ],
  },
  server: {
    port: PORT,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  preview: { port: PORT, host: true },
});
