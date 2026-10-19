import { afterEach, describe, expect, it } from 'vitest';
import { changeLocale, initLocale, localeState } from './locale.svelte';
import { m } from './paraglide/messages';

const COOKIE = 'PARAGLIDE_LOCALE';
const clearCookie = () => {
	document.cookie = `${COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

afterEach(() => {
	clearCookie();
	changeLocale('it');
	clearCookie();
});

describe('locale', () => {
	it('initLocale applies the session locale without writing the cookie', () => {
		clearCookie();
		expect(initLocale('en')).toBe('en');
		expect(localeState.current).toBe('en');
		expect(document.cookie).not.toContain(COOKIE);
	});

	it('an explicit choice writes the cookie, which then wins over the session', () => {
		clearCookie();
		changeLocale('en');
		expect(document.cookie).toContain(`${COOKIE}=en`);
		expect(initLocale('it')).toBe('en');
	});

	it('messages follow the reactive locale', () => {
		changeLocale('en');
		expect(m.common_cancel()).toBe('Cancel');
		changeLocale('it');
		expect(m.common_cancel()).toBe('Annulla');
	});
});
