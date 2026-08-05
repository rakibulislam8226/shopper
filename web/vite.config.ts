import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The single `.env` at the project root is shared by backend and frontend, so
// point Vite there instead of keeping a duplicate env file inside web/.
const rootEnvDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '');
  const port = Number(env.WEB_PORT ?? 5173);

  return {
    plugins: [react(), tailwindcss()],
    envDir: rootEnvDir,
    server: {
      port,
      host: true,
    },
    preview: {
      port,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
