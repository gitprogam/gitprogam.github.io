// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Search Console 이 sitemap-index.xml · sitemap-0.xml 을 계속 «가져올 수 없음» 으로 둬서,
// 표준 이름 sitemap.xml 로도 같은 내용을 낸다. sitemap() 보다 뒤에 있어야 그 결과를 복사한다.
/** @type {import('astro').AstroIntegration} */
const sitemapAlias = {
  name: 'sitemap-alias',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      copyFileSync(`${out}/sitemap-0.xml`, `${out}/sitemap.xml`);
    },
  },
};

export default defineConfig({
  site: 'https://gitprogam.github.io',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap(), sitemapAlias],
  vite: { plugins: [tailwindcss()] },
});
