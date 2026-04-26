import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://thegoodroster.com',
  output: 'static',
  integrations: [
    react(),
    mdx(),
    // sitemap(), // TODO: re-enable after upgrading @astrojs/sitemap to fix 'reduce' bug
    tailwind(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
  vite: {
    ssr: {
      external: ['ulid'],
    },
  },
});
