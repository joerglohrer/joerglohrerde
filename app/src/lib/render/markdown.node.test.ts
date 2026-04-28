// app/src/lib/render/markdown.node.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown (Node-Kontext)', () => {
  it('rendert einfaches Markdown im Node-Build ohne window', () => {
    const html = renderMarkdown('# Hallo\n\nWelt mit *Kursiv* und [Link](https://example.com)');
    expect(html).toContain('<h1');
    expect(html).toContain('Hallo');
    expect(html).toContain('<em>Kursiv</em>');
    expect(html).toContain('href="https://example.com"');
  });

  it('sanitisiert XSS-Versuche', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nText');
    expect(html).not.toContain('<script');
    expect(html).toContain('Text');
  });

  it('hebt code-blocks mit highlight.js hervor', () => {
    const html = renderMarkdown('```ts\nconst x: number = 1;\n```');
    expect(html).toContain('class="hljs');
    expect(html).toContain('language-ts');
  });
});
