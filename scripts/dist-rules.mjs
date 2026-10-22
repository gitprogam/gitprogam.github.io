import { parse } from 'node-html-parser';

const OWN = /(^|\.)binaryhub\.club$/i;
const BAD_REL = /\b(nofollow|ugc|sponsored)\b/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

const host = (href) => { try { return new URL(href).hostname; } catch { return ''; } };

export function checkCanonical(html, expectedHref) {
  const el = parse(html).querySelector('link[rel="canonical"]');
  if (!el) return ['canonical 없음'];
  const got = el.getAttribute('href');
  return got === expectedHref ? [] : [`canonical 불일치: ${got} (기대 ${expectedHref})`];
}

export function checkNofollow(html) {
  return parse(html).querySelectorAll('a[href]')
    .filter((a) => OWN.test(host(a.getAttribute('href'))) && BAD_REL.test(a.getAttribute('rel') ?? ''))
    .map((a) => `binaryhub 링크에 rel="${a.getAttribute('rel')}": ${a.getAttribute('href')}`);
}

export function checkEmails(html) {
  const root = parse(html);
  const out = [];
  if (root.querySelector('a[href^="mailto:"]')) out.push('mailto 링크 있음');
  const m = root.textContent.match(EMAIL);
  if (m) out.push(`본문에 이메일 주소: ${m[0]}`);
  for (const el of root.querySelectorAll('*')) {
    for (const [k, v] of Object.entries(el.attributes)) {
      if (k === 'src' || k === 'srcset' || k === 'href') continue; // 파일 이름의 @2x 등은 제외
      const mm = String(v).match(EMAIL);
      if (mm) out.push(`속성 ${k} 에 이메일 주소: ${mm[0]}`);
    }
  }
  return out;
}

export function checkPiiTerms(html, terms) {
  const lower = html.toLowerCase();
  // 단어 자체는 로그에 찍지 않는다. CI 로그도 공개다.
  return terms.filter((t) => t && lower.includes(t.toLowerCase())).map((t) => `금지 단어 발견 (길이 ${t.length})`);
}

export function checkProjectPage(html, minChars) {
  const root = parse(html);
  const article = root.querySelector('article[data-project]');
  if (!article) return [];
  const out = [];
  const body = article.querySelector('[data-body]');
  const n = body ? body.textContent.replace(/\s+/g, '').length : 0;
  if (n < minChars) out.push(`본문 ${n}자 < ${minChars}자`);
  const hasOwn = article.querySelectorAll('a[href]').some((a) => OWN.test(host(a.getAttribute('href'))));
  if (!hasOwn) out.push('binaryhub 링크 없음');
  return out;
}

export function checkOptionalScripts(html, env) {
  const out = [];
  if (!env.cf && html.includes('cloudflareinsights.com')) out.push('CF 토큰 없이 분석 스크립트가 있음');
  if (!env.giscus && html.includes('giscus.app')) out.push('Giscus 설정 없이 스크립트가 있음');
  return out;
}

export function draftSlugs(sources) {
  return sources
    .filter(({ text }) => {
      const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      return !(fm && /^draft:\s*false\s*$/m.test(fm[1]));
    })
    .map(({ slug }) => slug);
}
