/**
 * Viele alt-posts (Hugo-migration) beginnen im markdown mit `# <Titel>`,
 * der titel steht auf der seite aber schon als H1 aus dem event-tag.
 * Entfernt eine fuehrende H1, wenn sie dem post-titel entspricht.
 */
export function stripLeadingTitle(markdown: string, title: string): string {
	const match = markdown.match(/^\s*#[ \t]+(.+?)[ \t#]*\r?\n/);
	if (!match) return markdown;
	if (normalize(match[1]) !== normalize(title)) return markdown;
	return markdown.slice(match[0].length).replace(/^\s*\n/, '');
}

function normalize(s: string): string {
	return s
		.replace(/[*_`]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}
