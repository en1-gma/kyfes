<script lang="ts">
	import { m } from '$lib/shared/i18n';
	import StatusPage from './StatusPage.svelte';
</script>

<StatusPage code={403} title={m.common_forbidden_title()} text={m.common_forbidden_text()} />
