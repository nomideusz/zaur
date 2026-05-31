<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { appConfig } from '$lib/config';
	import { settings } from '$lib/stores/settings.svelte';

	const mailHref = $derived(settings.preferredMailHref());

	let { error, status }: { error: App.Error; status: number } = $props();

	const title = $derived(status === 404 ? 'Page not found' : 'Something went wrong');
	const message = $derived(
		error?.message && status !== 404
			? error.message
			: status === 404
				? 'The page you requested does not exist.'
				: 'An unexpected error occurred. Try again or return to your mail.'
	);
</script>

<svelte:head>
	<title>{title} · {appConfig.appName}</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface px-4">
	<div class="z-panel w-full max-w-md rounded-xl p-8 text-center">
		<p class="text-sm font-medium text-fg-muted">{status}</p>
		<h1 class="mt-2 text-xl font-semibold text-fg">{title}</h1>
		<p class="mt-2 text-sm text-fg-muted">{message}</p>
		<div class="mt-6 flex flex-wrap justify-center gap-2">
			<Button href={mailHref}>Open mail</Button>
			<Button href="/" variant="ghost">Emails</Button>
		</div>
	</div>
</div>
