import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, sortProjects } from './projects';

// SHOW_DRAFTS=1 은 e2e 빌드 전용. CI 배포에서는 절대 켜지 않는다(check-dist 가 막는다).
export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  const opts = { prod: import.meta.env.PROD, showDrafts: process.env.SHOW_DRAFTS === '1' };
  const all = await getCollection('projects', (e) => isPublished(e, opts));
  return sortProjects(all);
}
