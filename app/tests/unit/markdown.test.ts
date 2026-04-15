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

  it('rendert fenced code blocks mit hljs-klasse', () => {
    const html = renderMarkdown('```js\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
    expect(html).toContain('class="hljs');
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

  // Erweiterte XSS-Matrix — relevant ab Reply-Komponenten (3rd-party Content).
  it('entfernt onerror-Attribute auf inline-HTML-img', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html.toLowerCase()).not.toContain('onerror');
  });

  it('entfernt onclick-Attribute auf inline-HTML', () => {
    const html = renderMarkdown('<a href="#" onclick="alert(1)">x</a>');
    expect(html.toLowerCase()).not.toContain('onclick');
  });

  it('entfernt iframe-Tags', () => {
    const html = renderMarkdown('<iframe src="https://evil.com"></iframe>');
    expect(html.toLowerCase()).not.toContain('<iframe');
  });

  it('entfernt data:text/html-URLs in Links', () => {
    const html = renderMarkdown('[x](data:text/html,<script>alert(1)</script>)');
    expect(html.toLowerCase()).not.toMatch(/href="data:text\/html/);
  });

  it('entfernt vbscript:-URLs', () => {
    const html = renderMarkdown('<a href="vbscript:msgbox(1)">x</a>');
    expect(html.toLowerCase()).not.toContain('vbscript:');
  });

  it('entfernt script-Tag innerhalb svg', () => {
    const html = renderMarkdown('<svg><script>alert(1)</script></svg>');
    expect(html.toLowerCase()).not.toContain('<script');
  });
});
