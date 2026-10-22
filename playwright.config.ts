import { defineConfig, devices } from '@playwright/test';

// e2e 는 초안까지 포함한 빌드(SHOW_DRAFTS=1)와 가짜 Giscus 설정으로 돈다. 이 빌드 결과는 배포하지 않는다.
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4321' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx astro build && npx astro preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      SHOW_DRAFTS: '1',
      PUBLIC_GISCUS_REPO: 'gitprogam/gitprogam.github.io',
      PUBLIC_GISCUS_REPO_ID: 'TEST_REPO_ID',
      PUBLIC_GISCUS_CATEGORY: 'Comments',
      PUBLIC_GISCUS_CATEGORY_ID: 'TEST_CATEGORY_ID',
    },
  },
});
