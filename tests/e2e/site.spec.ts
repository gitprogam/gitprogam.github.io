import { test, expect } from '@playwright/test';

async function allPaths(request: import('@playwright/test').APIRequestContext) {
  const xml = await (await request.get('/sitemap-0.xml')).text();
  return [...xml.matchAll(/<loc>https:\/\/gitprogam\.github\.io(\/[^<]*)<\/loc>/g)].map((m) => m[1]).concat(['/404.html']);
}

test('360px 에서 어떤 페이지도 가로로 넘치지 않는다', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const paths = await allPaths(request);
  expect(paths.length).toBeGreaterThan(3);
  for (const p of paths) {
    await page.goto(p);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `${p} 가 ${over}px 넘침`).toBeLessThanOrEqual(0);
  }
});

test('Tab 한 번이면 건너뛰기 링크가 보이고 포커스 테두리가 있다', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const link = page.getByRole('link', { name: '본문으로 건너뛰기' });
  await expect(link).toBeFocused();
  await expect(link).toBeInViewport();
  const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('홈에서 프로젝트로 클라이언트 이동한 뒤에도 Giscus 스크립트가 붙는다', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href^="/projects/"]').first().click();
  await expect(page.locator('article[data-project]')).toBeVisible();
  await expect(page.locator('section[aria-label="반응과 댓글"] script[src*="giscus.app"], section[aria-label="반응과 댓글"] .giscus')).toHaveCount(1, { timeout: 10_000 });
});

// 화면 전환 애니메이션이 실제로 시작되는 순간(viewTransition.ready)에 문서의 애니메이션 수를 잰다.
// astro:after-swap 시점에는 아직 시작 전이라 설정과 무관하게 0 이 나온다(대조군으로 확인).
async function transitionAnimationCount(browser: import('@playwright/test').Browser, reducedMotion: 'reduce' | 'no-preference') {
  const ctx = await browser.newContext({ reducedMotion });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.evaluate(() => {
    const w = window as unknown as { __anims?: number };
    document.addEventListener('astro:before-swap', (e) => {
      const vt = (e as unknown as { viewTransition?: ViewTransition }).viewTransition;
      if (!vt) { w.__anims = 0; return; }
      vt.ready.then(() => { w.__anims = document.getAnimations().length; }).catch(() => { w.__anims = 0; });
    }, { once: true });
  });
  await page.locator('a[href^="/projects/"]').first().click();
  await expect(page.locator('article[data-project]')).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __anims?: number }).__anims !== undefined);
  const n = await page.evaluate(() => (window as unknown as { __anims: number }).__anims);
  await ctx.close();
  return n;
}

test('동작 줄이기 설정에서는 페이지 전환 애니메이션이 없다', async ({ browser }) => {
  expect(await transitionAnimationCount(browser, 'reduce')).toBe(0);
});

test('대조군: 동작 줄이기를 끄면 같은 이동에서 애니메이션이 잡힌다', async ({ browser }) => {
  // 위 테스트가 "측정이 아예 안 돼서 0" 인 것이 아님을 보증한다.
  expect(await transitionAnimationCount(browser, 'no-preference')).toBeGreaterThan(0);
});
