// 빌드 결과(dist) 검사. 하나라도 걸리면 exit 1 → CI 에서 배포가 멈춘다.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  checkCanonical, checkNofollow, checkEmails, checkPiiTerms,
  checkProjectPage, checkOptionalScripts, draftSlugs, checkInternalLinks,
} from './dist-rules.mjs';

const SITE = 'https://gitprogam.github.io';
const DIST = 'dist';
const MIN_CHARS = 1500;
const terms = (process.env.PII_TERMS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const env = {
  cf: !!process.env.PUBLIC_CF_BEACON_TOKEN,
  giscus: !!(process.env.PUBLIC_GISCUS_REPO_ID && process.env.PUBLIC_GISCUS_CATEGORY_ID),
};

if (!existsSync(DIST)) { console.error('dist 없음. 먼저 빌드하세요.'); process.exit(1); }
if (process.env.SHOW_DRAFTS === '1') { console.error('SHOW_DRAFTS=1 빌드는 배포 검사 대상이 아닙니다.'); process.exit(1); }
if (!terms.length) console.warn('⚠ PII_TERMS 가 비어 있어 금지 단어 검사를 건너뜁니다.');

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const pagePaths = new Set(htmlFiles.map((f) => '/' + relative(DIST, f).split(sep).join('/').replace(/index\.html$/, '')));

const problems = [];
for (const file of htmlFiles) {
  const rel = relative(DIST, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');
  const path = '/' + rel.replace(/index\.html$/, '');
  const issues = [
    ...(rel === '404.html' ? [] : checkCanonical(html, SITE + path)),
    ...checkNofollow(html),
    ...checkEmails(html),
    ...checkPiiTerms(html, terms),
    ...checkProjectPage(html, MIN_CHARS),
    ...checkOptionalScripts(html, env),
    ...checkInternalLinks(html, pagePaths),
  ];
  for (const i of issues) problems.push(`${rel}: ${i}`);
}

// 초안 누출: 머리말에 draft: false 가 없는 글은 dist·sitemap·홈 어디에도 있으면 안 된다.
const srcDir = 'src/content/projects';
const drafts = draftSlugs(readdirSync(srcDir).filter((f) => f.endsWith('.mdx'))
  .map((f) => ({ slug: f.replace(/\.mdx$/, ''), text: readFileSync(join(srcDir, f), 'utf8') })));
const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8') : '';
// robots.txt 가 가리키는 sitemap.xml 은 sitemap-0.xml 과 같아야 한다(astro.config 의 sitemapAlias).
const sitemapAlias = existsSync(join(DIST, 'sitemap.xml')) ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8') : '';
if (!sitemap || sitemapAlias !== sitemap) problems.push('sitemap.xml 이 없거나 sitemap-0.xml 과 다름');
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
for (const slug of drafts) {
  if (existsSync(join(DIST, 'projects', slug))) problems.push(`초안 누출: dist/projects/${slug}/`);
  if (sitemap.includes(`/projects/${slug}/`)) problems.push(`초안 누출: sitemap 에 ${slug}`);
  if (home.includes(`/projects/${slug}/`)) problems.push(`초안 누출: 홈에 ${slug} 링크`);
}

if (problems.length) {
  console.error(`검사 실패 ${problems.length}건\n` + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('check-dist: 통과');
