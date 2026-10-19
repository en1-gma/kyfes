import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
	it.each(['/orders', '/orders/1?tab=x', '/a#b'])('accepts the relative path %s', (path) => {
		expect(safeRedirect(path)).toBe(path);
	});

	it.each([
		'//evil.example',
		'https://evil.example',
		'javascript:alert(1)',
		'/\\evil.example',
		'\\\\evil.example',
		'/orders\n',
		'/.//evil.example',
		'/a/..//evil.example',
		'/%2e%2e//evil.example',
		'/..//evil.example',
		'/./%2F/evil.example',
		'orders',
		'',
		undefined,
		42
	])('rejects %s', (value) => {
		expect(safeRedirect(value)).toBe('/');
	});

	it('uses the given fallback', () => {
		expect(safeRedirect('//x', '/home')).toBe('/home');
	});

	it('normalizes dot segments that stay on the same origin', () => {
		expect(safeRedirect('/a/../orders')).toBe('/orders');
	});
});
