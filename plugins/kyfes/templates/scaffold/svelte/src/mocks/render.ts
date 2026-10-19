import { render } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { createAppQueryClient } from '$lib/shared/api';
import type { MockUser } from './data';
import { useMockUser } from './handlers';
import TestProviders from './TestProviders.svelte';

/** Renders a component with QueryClient + ability fed by the MSW session of `user`. */
export function renderWithProviders<Props extends Record<string, unknown>>(
	component: Component<Props>,
	options: { props?: Props; user?: MockUser } = {}
) {
	useMockUser(options.user ?? 'manager');
	const client = createAppQueryClient();
	client.setDefaultOptions({
		queries: { ...client.getDefaultOptions().queries, enabled: true, retry: false }
	});
	const result = render(TestProviders, {
		props: {
			client,
			component: component as unknown as Component<Record<string, unknown>>,
			props: options.props ?? {}
		}
	});
	return { ...result, client };
}
