import { describe, expect, it } from 'vitest';
import { stripLeadingTitle } from './stripTitle';

describe('stripLeadingTitle', () => {
	it('entfernt eine fuehrende H1, die dem titel entspricht', () => {
		expect(stripLeadingTitle('# Mein Titel\n\nText', 'Mein Titel')).toBe('Text');
		expect(stripLeadingTitle('\n#  Mein   Titel  \nText', 'mein titel')).toBe('Text');
		expect(stripLeadingTitle('# *Mein* Titel #\n\nText', 'Mein Titel')).toBe('Text');
	});

	it('laesst anderes markdown unangetastet', () => {
		expect(stripLeadingTitle('# Anderer Titel\n\nText', 'Mein Titel')).toBe('# Anderer Titel\n\nText');
		expect(stripLeadingTitle('Text\n\n# Mein Titel\n', 'Mein Titel')).toBe('Text\n\n# Mein Titel\n');
		expect(stripLeadingTitle('## Mein Titel\n\nText', 'Mein Titel')).toBe('## Mein Titel\n\nText');
		expect(stripLeadingTitle('', 'Mein Titel')).toBe('');
	});
});
