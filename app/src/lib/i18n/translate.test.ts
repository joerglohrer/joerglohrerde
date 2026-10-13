import { describe, expect, it } from 'vitest';
import { translate } from './index';

describe('translate', () => {
	it('loest punkt-notation pro locale auf', () => {
		expect(translate('de', 'nav.archive')).toBe('Archiv');
		expect(translate('en', 'nav.archive')).toBe('Archive');
	});

	it('faellt auf deutsch und dann auf den key zurueck', () => {
		expect(translate('en', 'nav.brand_aria')).toBe('Go to homepage');
		expect(translate('en', 'gibt.es.nicht')).toBe('gibt.es.nicht');
	});

	it('ersetzt platzhalter', () => {
		expect(translate('de', 'post.published_on', { date: '1. Mai 2026' })).toBe(
			'Veröffentlicht am 1. Mai 2026'
		);
		expect(translate('en', 'post.not_found', { slug: 'x' })).toBe('Post "x" not found.');
	});
});
