<script lang="ts">
	import { page } from '$app/state';
	import { ErrorState, ForbiddenPage, NotFoundPage } from '$lib/shared/ui';
</script>

<!-- Route error boundary: 403 page (never a silent redirect), 404, generic error + correlationId. -->
{#if page.status === 403}
	<ForbiddenPage />
{:else if page.status === 404}
	<NotFoundPage />
{:else}
	<ErrorState correlationId={page.error?.correlationId} />
{/if}
