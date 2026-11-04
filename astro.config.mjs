// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Search Console 이 sitemap-index.xml · sitemap-0.xml 을 계속 «가져올 수 없음» 으로 둬서,
// 표준 이름 sitemap.xml 로도 같은 내용을 낸다. sitemap() 보다 뒤에 있어야 그 결과를 복사한다.
//
// sitemap.xml 도 똑같이 «가져올 수 없음» 이었다(2026-11-04). 파일은 200 · application/xml · 정상 XML 인데도.
// GitHub Pages 에서 흔한 증상이고(github.com/orgs/community/discussions/199426), 거기서 통한 방법은 한 번도
// 제출한 적 없는 새 이름으로 내는 것이었다. 그래서 같은 목록을 텍스트 사이트맵(sitemap.txt, 한 줄에 URL 하나)으로도 낸다.
/** @type {import('astro').AstroIntegration} */
const sitemapAlias = {
  name: 'sitemap-alias',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      copyFileSync(`${out}/sitemap-0.xml`, `${out}/sitemap.xml`);
      const urls = [...readFileSync(`${out}/sitemap-0.xml`, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      writeFileSync(`${out}/sitemap.txt`, `${urls.join('\n')}\n`);
    },
  },
};

export default defineConfig({
  site: 'https://gitprogam.github.io',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap(), sitemapAlias],
  vite: { plugins: [tailwindcss()] },
});
