export type Status = 'live' | 'done' | 'wip';
export type Group = 'live' | 'project';
export interface Period { start: Date; end?: Date }
export interface ProjectLike {
  id: string;
  data: { title: string; group: Group; status: Status; order: number; period: Period; draft: boolean };
}
type Link = { text: string; href: string };
export type MetaRow =
  | { label: string; kind: 'text'; value: string }
  | { label: string; kind: 'tags'; value: string[] }
  | { label: string; kind: 'links'; value: Link[] };

export function isPublished(entry: { data: { draft: boolean } }, opts: { prod: boolean; showDrafts: boolean }): boolean {
  if (!opts.prod || opts.showDrafts) return true;
  return entry.data.draft === false;
}

export function sortProjects<T extends ProjectLike>(entries: T[]): T[] {
  const live = entries.filter((e) => e.data.group === 'live').sort((a, b) => a.data.order - b.data.order);
  const proj = entries
    .filter((e) => e.data.group === 'project')
    .sort((a, b) => b.data.period.start.getTime() - a.data.period.start.getTime());
  return [...live, ...proj];
}

const SECTION_TITLE: Record<Group, string> = { live: '운영 중인 서비스', project: '연구·프로젝트' };

export function homeSections<T extends ProjectLike>(entries: T[]) {
  const sorted = sortProjects(entries);
  return (['live', 'project'] as const)
    .map((key) => ({ key, title: SECTION_TITLE[key], items: sorted.filter((e) => e.data.group === key) }))
    .filter((s) => s.items.length > 0);
}

const ym = (d: Date) => `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export function formatPeriod(p: Period, status: Status): string {
  const start = ym(p.start);
  if (!p.end) return status === 'done' ? start : `${start} – 지금`;
  const end = ym(p.end);
  return start === end ? start : `${start} – ${end}`;
}

export function statusLabel(s: Status): string {
  return { live: '운영 중', done: '완료', wip: '개발 중' }[s];
}

export function metaRows(data: {
  role: string; period: Period; status: Status; stack: string[];
  links: { site?: string; code?: string; posts: { title: string; url: string }[] };
}): MetaRow[] {
  const rows: MetaRow[] = [
    { label: '역할', kind: 'text', value: data.role },
    { label: '기간', kind: 'text', value: formatPeriod(data.period, data.status) },
    { label: '상태', kind: 'text', value: statusLabel(data.status) },
    { label: '기술', kind: 'tags', value: data.stack },
  ];
  const links: Link[] = [];
  if (data.links.site) links.push({ text: '사이트 열기', href: data.links.site });
  if (data.links.code) links.push({ text: '코드 보기', href: data.links.code });
  for (const post of data.links.posts) links.push({ text: post.title, href: post.url });
  if (links.length) rows.push({ label: '링크', kind: 'links', value: links });
  return rows;
}
