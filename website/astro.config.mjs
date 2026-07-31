// @ts-check
import { defineConfig } from 'astro/config';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://staruhub.github.io',
  base: '/awesome-workbuddy',
  ...(process.env.ASTRO_OUT_DIR
    ? { outDir: resolve(process.env.ASTRO_OUT_DIR) }
    : {}),
  vite: {
    plugins: [tailwindcss()]
  }
});
