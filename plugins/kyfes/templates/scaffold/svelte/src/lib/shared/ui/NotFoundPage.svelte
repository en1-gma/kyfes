<script lang="ts">
	import { m } from '$lib/shared/i18n';
	import StatusPage from './StatusPage.svelte';
</script>

<StatusPage code={404} title={m.common_not_found_title()} text={m.common_not_found_text()} />
