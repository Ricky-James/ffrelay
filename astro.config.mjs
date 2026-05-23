import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL || 'https://ffrelay.com',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'static',
  compressHTML: true,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja'],
    routing: { prefixDefaultLocale: false },
  },
  // Scope component styles via data-astro-* attributes rather than mangled class names —
  // more predictable when targeting elements from global CSS or JavaScript.
  scopedStyleStrategy: 'attribute',
  integrations: [
    ...(process.env.SITE_URL
      ? [
          sitemap({
            // Emit <xhtml:link rel="alternate"> entries so search engines treat
            // /schedule and /ja/schedule as translations of each other rather
            // than duplicate content.
            i18n: {
              defaultLocale: 'en',
              locales: { en: 'en-US', ja: 'ja-JP' },
            },
          }),
        ]
      : []),
  ],
  image: {
    service: {
      config: {
        jpeg: { mozjpeg: true },
        webp: { effort: 4 },
        avif: { effort: 4, chromaSubsampling: '4:2:0' },
      },
    },
  },
});
