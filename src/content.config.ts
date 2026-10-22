import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '*.mdx' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        summary: z.string().min(1).max(80),
        context: z.string().min(1), // 기간 옆에 붙는 한 줄 맥락. 예: '학술 발표회', 'binaryhub.club'
        period: z.object({ start: z.coerce.date(), end: z.coerce.date().optional() }),
        status: z.enum(['live', 'done', 'wip']),
        group: z.enum(['live', 'project']),
        role: z.string().min(1),
        stack: z.array(z.string()).min(1),
        links: z
          .object({
            site: z.string().url().optional(),
            code: z.string().url().optional(),
            posts: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
          })
          .default({ posts: [] }),
        order: z.number().int().default(99),
        cover: image().optional(),
        coverAlt: z.string().optional(),
        // 빠뜨리면 초안. 사용자가 승인한 페이지만 false 로 바꾼다.
        draft: z.boolean().default(true),
      })
      .refine((d) => !d.cover || !!d.coverAlt, { message: 'cover 를 넣으면 coverAlt 도 필요', path: ['coverAlt'] }),
});

export const collections = { projects };
