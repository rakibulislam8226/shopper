import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The single `.env` at the project root is shared by backend and frontend, so
// point Vite there instead of keeping a duplicate env file inside web/.
const webDir = dirname(fileURLToPath(import.meta.url));
const rootEnvDir = resolve(webDir, '..');
const srcDir = resolve(webDir, 'src');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '');
  const port = Number(env.WEB_PORT ?? 5173);

  return {
    plugins: [react(), tailwindcss()],
    envDir: rootEnvDir,
    // Mirrors the "paths" aliases in tsconfig.json — keep both in sync.
    resolve: {
      alias: {
        '@api': resolve(srcDir, 'api'),
        '@app': resolve(srcDir, 'app'),
        '@components': resolve(srcDir, 'components'),
        '@lib': resolve(srcDir, 'lib'),
        '@pages': resolve(srcDir, 'pages'),
        '@plugins': resolve(srcDir, 'plugins'),
        '@router': resolve(srcDir, 'router'),
        '@stores': resolve(srcDir, 'stores'),
        '@': srcDir,
      },
    },
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
