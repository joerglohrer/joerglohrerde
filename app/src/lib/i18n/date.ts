import type { SupportedLocale } from './activeLocale';

const TAGS: Record<SupportedLocale, string> = { de: 'de-DE', en: 'en-GB' };

/** Unix-sekunden → "13. Oktober 2026" bzw. "13 October 2026". */
export function formatDate(unixSeconds: number, locale: SupportedLocale): string {
	return new Date(unixSeconds * 1000).toLocaleDateString(TAGS[locale] ?? TAGS.de, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/** Unix-sekunden → datum + uhrzeit, fuer kommentare. */
export function formatDateTime(unixSeconds: number, locale: SupportedLocale): string {
	return new Date(unixSeconds * 1000).toLocaleString(TAGS[locale] ?? TAGS.de, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
}
