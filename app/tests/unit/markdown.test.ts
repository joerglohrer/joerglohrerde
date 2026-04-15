import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '$lib/render/markdown';

describe('renderMarkdown', () => {
  it('rendert einfachen Markdown-Text zu HTML', () => {
    const html = renderMarkdown('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('entfernt <script>-Tags (DOMPurify)', () => {
    const html = renderMarkdown('hello <script>alert("x")</script> world');
    expect(html).not.toContain('<script>');
  });

  it('entfernt javascript:-URLs', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toMatch(/javascript:/i);
  });

  it('rendert Links mit http:// und erhält das href', () => {
    const html = renderMarkdown('[nostr](https://nostr.com)');
    expect(html).toContain('href="https://nostr.com"');
  });

  it('rendert horizontale Linie aus ---', () => {
    const html = renderMarkdown('oben\n\n---\n\nunten');
    expect(html).toContain('<hr>');
  });

  it('rendert fenced code blocks', () => {
    const html = renderMarkdown('```js\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
  });

  it('rendert GFM tables', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |';
    const html = renderMarkdown(md);
    expect(html).toContain('<table');
    expect(html).toContain('<td>1</td>');
  });

  it('rendert Bilder', () => {
    const html = renderMarkdown('![alt](https://example.com/img.png)');
    expect(html).toContain('<img');
    expect(html).toContain('src="https://example.com/img.png"');
  });
});
