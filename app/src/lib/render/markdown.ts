import { Marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);

const markedInstance = new Marked({
	breaks: true,
	gfm: true,
	renderer: {
		code({ text, lang }) {
			const language = lang && hljs.getLanguage(lang) ? lang : undefined;
			const highlighted = language
				? hljs.highlight(text, { language }).value
				: hljs.highlightAuto(text).value;
			const cls = language ? ` language-${language}` : '';
			return `<pre><code class="hljs${cls}">${highlighted}</code></pre>`;
		}
	}
});

export function renderMarkdown(md: string): string {
	const raw = markedInstance.parse(md, { async: false }) as string;
	return DOMPurify.sanitize(raw);
}
