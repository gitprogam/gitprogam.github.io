import { describe, it, expect } from 'vitest';
import {
  checkCanonical, checkNofollow, checkEmails, checkPiiTerms,
  checkProjectPage, checkOptionalScripts, draftSlugs, checkInternalLinks,
} from '../scripts/dist-rules.mjs';

const page = (head: string, body: string) => `<html><head>${head}</head><body>${body}</body></html>`;

describe('checkCanonical', () => {
  it('맞으면 통과', () => {
    expect(checkCanonical(page('<link rel="canonical" href="https://gitprogam.github.io/about/">', ''), 'https://gitprogam.github.io/about/')).toEqual([]);
  });
  it('없거나 다르면 문제', () => {
    expect(checkCanonical(page('', ''), 'https://gitprogam.github.io/')).toHaveLength(1);
    expect(checkCanonical(page('<link rel="canonical" href="https://gitprogam.github.io/x/">', ''), 'https://gitprogam.github.io/')).toHaveLength(1);
  });
});

describe('checkNofollow', () => {
  it('binaryhub 로 가는 nofollow 는 문제', () => {
    expect(checkNofollow(page('', '<a href="https://binaryhub.club/" rel="nofollow">x</a>'))).toHaveLength(1);
    expect(checkNofollow(page('', '<a href="https://blog.binaryhub.club/a/" rel="noopener ugc">x</a>'))).toHaveLength(1);
  });
  it('rel 이 없거나 다른 도메인이면 통과', () => {
    expect(checkNofollow(page('', '<a href="https://binaryhub.club/studyace">x</a><a href="https://example.com" rel="nofollow">y</a>'))).toEqual([]);
  });
});

describe('checkEmails', () => {
  it('이메일과 mailto 를 잡는다', () => {
    expect(checkEmails(page('', '<p>someone@example.com</p>'))).toHaveLength(1);
    expect(checkEmails(page('', '<a href="mailto:x">연락</a>'))).toHaveLength(1);
  });
  it('이미지 파일 이름의 @2x 같은 것은 잡지 않는다', () => {
    expect(checkEmails(page('', '<img src="/a@2x.png" alt="">'))).toEqual([]);
  });
});

describe('checkPiiTerms', () => {
  it('목록의 단어가 속성에 있어도 잡는다', () => {
    expect(checkPiiTerms(page('', '<img alt="홍길동 발표 사진" src="x.png">'), ['홍길동'])).toHaveLength(1);
  });
  it('빈 목록이면 통과', () => {
    expect(checkPiiTerms(page('', '<p>홍길동</p>'), [])).toEqual([]);
  });
});

describe('checkProjectPage', () => {
  const body = (n: number, link = '<a href="https://binaryhub.club/">s</a>') =>
    page('', `<article data-project="x" data-group="live"><div data-body><p>${'가'.repeat(n)}</p>${link}</div></article>`);
  it('본문이 짧으면 문제', () => {
    expect(checkProjectPage(body(100), 1500).join()).toMatch(/1500/);
  });
  it('binaryhub 링크가 없으면 문제', () => {
    expect(checkProjectPage(body(1600, ''), 1500).join()).toMatch(/binaryhub/);
  });
  it('요약 칸에 있는 링크도 인정한다', () => {
    const html = page('', `<article data-project="x" data-group="project"><aside><a href="https://blog.binaryhub.club/p/">글</a></aside><div data-body><p>${'가'.repeat(1600)}</p></div></article>`);
    expect(checkProjectPage(html, 1500)).toEqual([]);
  });
  it('프로젝트 페이지가 아니면 검사하지 않는다', () => {
    expect(checkProjectPage(page('', '<p>짧음</p>'), 1500)).toEqual([]);
  });
});

describe('checkOptionalScripts', () => {
  const both = page('<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>', '<script src="https://giscus.app/client.js"></script>');
  it('환경변수가 없는데 스크립트가 있으면 문제', () => {
    expect(checkOptionalScripts(both, { cf: false, giscus: false })).toHaveLength(2);
  });
  it('환경변수가 있으면 통과', () => {
    expect(checkOptionalScripts(both, { cf: true, giscus: true })).toEqual([]);
  });
});

describe('draftSlugs', () => {
  it('draft: false 가 없으면 초안', () => {
    const out = draftSlugs([
      { slug: 'a', text: '---\ntitle: A\ndraft: false\n---\n' },
      { slug: 'b', text: '---\ntitle: B\ndraft: true\n---\n' },
      { slug: 'c', text: '---\ntitle: C\n---\n' },
      { slug: 'd', text: '---\ntitle: D\n---\n본문에 draft: false 라고 써도 머리말이 아니면 무시\n' },
    ]);
    expect(out).toEqual(['b', 'c', 'd']);
  });
  it('CRLF 줄바꿈이어도 draft: false 를 알아본다', () => {
    expect(draftSlugs([{ slug: 'e', text: '---\r\ntitle: E\r\ndraft: false\r\n---\r\n' }])).toEqual([]);
  });
});

describe('checkInternalLinks', () => {
  const pages = new Set(['/', '/about/', '/projects/a/']);
  it('있는 페이지로 가는 링크는 통과', () => {
    expect(checkInternalLinks(page('', '<a href="/projects/a/">a</a><a href="/about/">s</a><a href="/#projects">p</a>'), pages)).toEqual([]);
  });
  it('없는 페이지(초안 등)로 가는 링크는 문제', () => {
    expect(checkInternalLinks(page('', '<a href="/projects/b/">b</a>'), pages)).toEqual(['깨진 내부 링크: /projects/b/']);
  });
  it('바깥 링크와 정적 파일은 보지 않는다', () => {
    expect(checkInternalLinks(page('<link rel="icon" href="/favicon.svg">', '<a href="https://binaryhub.club/x">x</a><a href="/favicon.svg">f</a>'), pages)).toEqual([]);
  });
});
