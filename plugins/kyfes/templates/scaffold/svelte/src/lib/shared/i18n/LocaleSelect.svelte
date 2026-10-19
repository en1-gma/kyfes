<script lang="ts">
	import { changeLocale, localeState, locales, type Locale } from './locale.svelte';
	import { m } from './paraglide/messages';

	const labels: Record<Locale, () => string> = {
		it: () => m.common_locale_it(),
		en: () => m.common_locale_en()
	};

	function onchange(event: Event & { currentTarget: HTMLSelectElement }) {
		const value = event.currentTarget.value;
		const next = locales.find((locale) => locale === value);
		if (next) changeLocale(next);
	}
</script>

<label class="locale-select">
	<span class="visually-hidden">{m.common_locale_label()}</span>
	<select value={localeState.current} {onchange}>
		{#each locales as locale (locale)}
			<option value={locale}>{labels[locale]()}</option>
		{/each}
	</select>
</label>
