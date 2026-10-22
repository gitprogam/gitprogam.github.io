import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// 로그인 없이 보이는 첫 화면만 찍는다. 개인 정보가 찍힐 수 있는 화면(로그인 뒤, 회원 목록)은 대상이 아니다.
// clip: 잘라 낼 영역. BBlog 는 글 목록에 저자 실명이 나오므로 맨 위 대문만 찍는다.
// wait: load 뒤 추가로 기다릴 시간. networkidle 은 계속 요청을 보내는 페이지(무쓸모.앱)에서 끝나지 않는다.
const targets = [
  { slug: 'nsgh-tools', url: 'https://binaryhub.club/' },
  { slug: 'studyace', url: 'https://binaryhub.club/studyace' },
  { slug: 'bblog', url: 'https://blog.binaryhub.club/', clip: { x: 0, y: 0, width: 1440, height: 575 } },
  { slug: 'useless', url: 'https://useless.binaryhub.club/' },
  { slug: 'dothair-defense', url: 'https://dothair.pages.dev/', wait: 20000, clip: { x: 0, y: 0, width: 1440, height: 345 } }, // Unity 로딩 화면이 지나갈 때까지 기다리고, 부제의 인명은 잘라 낸다
];

mkdirSync('src/assets/shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ko-KR' });
for (const t of targets) {
  try {
    await page.goto(t.url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(t.wait ?? 1500);
    await page.screenshot({ path: `src/assets/shots/${t.slug}.png`, clip: t.clip });
    console.log('ok', t.slug);
  } catch (e) {
    console.error('실패', t.slug, e.message);
  }
}
await browser.close();
