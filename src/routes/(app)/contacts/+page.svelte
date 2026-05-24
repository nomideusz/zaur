<script lang="ts">
	import { Users } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<svelte:head>
	<title>Contacts · ZAUR</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-8">
	<div class="z-panel rounded-xl p-8 text-center">
		<Users class="mx-auto size-10 text-accent" aria-hidden="true" />
		<h1 class="mt-4 text-2xl font-semibold text-fg">Contacts</h1>
		<p class="mx-auto mt-2 max-w-md text-sm text-fg-muted">
			Address books and contact cards will sync with your ZAUR account via CardDAV/JMAP Contacts.
			This tool is not available yet.
		</p>
		<div class="mt-6">
			<Button href="/mail/inbox" variant="ghost">Back to mail</Button>
		</div>
	</div>
</div>
