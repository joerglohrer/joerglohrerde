import { Marked } from 'marked';
import DOMPurify from 'dompurify';
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

/**
 * Lokaler Marked-Instance, damit die globale `marked`-Singleton nicht
 * mutiert wird — andere Module können `marked` unbeeinflusst weiterverwenden.
 * (Spec §3: lokale Ersetzbarkeit der Engine.)
 */
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

/**
 * Rendert einen Markdown-String zu sanitized HTML.
 * Einziger Export des Moduls — so bleibt Austausch der Engine lokal.
 *
 * Nur im Browser/jsdom aufrufen: DOMPurify braucht ein DOM. Die SPA
 * hat SSR global ausgeschaltet (`+layout.ts: ssr = false`), Vitest läuft
 * in jsdom — beide Szenarien sind abgedeckt. Ein Aufruf in reiner
 * Node-Umgebung würde hier laut fehlschlagen statt stumm unsicher
 * durchzulaufen.
 */
export function renderMarkdown(md: string): string {
	if (typeof window === 'undefined') {
		throw new Error('renderMarkdown: DOM-Kontext erforderlich (Browser oder jsdom).');
	}
	const raw = markedInstance.parse(md, { async: false }) as string;
	return DOMPurify.sanitize(raw);
}
