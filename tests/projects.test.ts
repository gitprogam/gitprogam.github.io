import { describe, it, expect } from 'vitest';
import {
  isPublished, sortProjects, homeSections, formatPeriod, statusLabel, metaRows,
  type ProjectLike,
} from '../src/lib/projects';

const d = (s: string) => new Date(s + 'T00:00:00Z');
const p = (id: string, over: Partial<ProjectLike['data']> = {}): ProjectLike => ({
  id,
  data: { title: id, group: 'project', status: 'done', order: 99, period: { start: d('2026-01-01') }, draft: false, ...over },
});

describe('isPublished', () => {
  it('프로덕션에서는 draft 가 아닌 것만', () => {
    expect(isPublished({ data: { draft: true } }, { prod: true, showDrafts: false })).toBe(false);
    expect(isPublished({ data: { draft: false } }, { prod: true, showDrafts: false })).toBe(true);
  });
  it('개발 서버와 SHOW_DRAFTS 빌드에서는 초안도 보인다', () => {
    expect(isPublished({ data: { draft: true } }, { prod: false, showDrafts: false })).toBe(true);
    expect(isPublished({ data: { draft: true } }, { prod: true, showDrafts: true })).toBe(true);
  });
});

describe('sortProjects', () => {
  it('운영 중 묶음이 order 순으로 먼저, 프로젝트는 최신순', () => {
    const out = sortProjects([
      p('old', { period: { start: d('2025-09-01') } }),
      p('b', { group: 'live', order: 2 }),
      p('new', { period: { start: d('2026-07-06') } }),
      p('a', { group: 'live', order: 1 }),
    ]).map((e) => e.id);
    expect(out).toEqual(['a', 'b', 'new', 'old']);
  });
});

describe('homeSections', () => {
  it('비어 있는 묶음은 섹션을 만들지 않는다', () => {
    const s = homeSections([p('a', { group: 'live', order: 1 })]);
    expect(s.map((x) => x.key)).toEqual(['live']);
    expect(s[0].title).toBe('운영 중인 서비스');
  });
  it('둘 다 있으면 운영 중이 먼저', () => {
    const s = homeSections([p('x'), p('a', { group: 'live', order: 1 })]);
    expect(s.map((x) => x.title)).toEqual(['운영 중인 서비스', '연구·프로젝트']);
  });
  it('아무것도 없으면 빈 배열', () => {
    expect(homeSections([])).toEqual([]);
  });
});

describe('formatPeriod', () => {
  it('시작과 끝이 같은 달이면 한 번만', () => {
    expect(formatPeriod({ start: d('2026-07-06'), end: d('2026-07-08') }, 'done')).toBe('2026.07');
  });
  it('달이 다르면 범위', () => {
    expect(formatPeriod({ start: d('2025-09-01'), end: d('2025-12-15') }, 'done')).toBe('2025.09 – 2025.12');
  });
  it('끝이 없고 운영 중·개발 중이면 물결표', () => {
    expect(formatPeriod({ start: d('2026-06-03') }, 'live')).toBe('2026.06 ~');
    expect(formatPeriod({ start: d('2026-07-27') }, 'wip')).toBe('2026.07 ~');
  });
  it('끝이 없고 완료면 시작 달만', () => {
    expect(formatPeriod({ start: d('2026-04-28') }, 'done')).toBe('2026.04');
  });
  it('시간대 때문에 달이 밀리지 않는다 (UTC 기준)', () => {
    expect(formatPeriod({ start: d('2026-05-01') }, 'done')).toBe('2026.05');
  });
});

describe('statusLabel', () => {
  it('한국어 표시', () => {
    expect([statusLabel('live'), statusLabel('done'), statusLabel('wip')]).toEqual(['운영 중', '완료', '개발 중']);
  });
});

describe('metaRows', () => {
  const base = { role: '혼자 개발', period: { start: d('2026-07-06'), end: d('2026-07-08') }, status: 'done' as const, stack: ['PixiJS'] };
  it('링크가 하나도 없으면 링크 행이 없다', () => {
    const rows = metaRows({ ...base, links: { posts: [] } });
    expect(rows.map((r) => r.label)).toEqual(['역할', '기간', '상태', '기술']);
  });
  it('링크는 사이트, 코드, 관련 글 순서', () => {
    const rows = metaRows({ ...base, links: { site: 'https://binaryhub.club/', code: 'https://github.com/gitprogam/satris', posts: [{ title: '글', url: 'https://blog.binaryhub.club/x/' }] } });
    const links = rows.find((r) => r.label === '링크')!;
    expect(links.kind).toBe('links');
    expect((links.value as { text: string }[]).map((l) => l.text)).toEqual(['사이트 열기', '코드 보기', '글']);
  });
});
