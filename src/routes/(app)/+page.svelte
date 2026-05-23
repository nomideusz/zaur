<script lang="ts">
	import { Calendar, Mail, Users } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<svelte:head>
	<title>Home · ZAUR</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 p-8">
	<div>
		<h1 class="text-2xl font-semibold text-fg">Welcome back</h1>
		<p class="mt-1 text-sm text-fg-muted">Choose a tool to get started.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<a href="/mail/inbox" class="z-panel group rounded-xl p-5 transition-shadow hover:shadow-md">
			<Mail class="size-6 text-accent" aria-hidden="true" />
			<h2 class="mt-3 font-medium text-fg group-hover:text-accent">Mail</h2>
			<p class="mt-1 text-xs text-fg-muted">Read and send messages</p>
		</a>

		<div class="z-panel rounded-xl p-5 opacity-50">
			<Calendar class="size-6 text-fg-subtle" aria-hidden="true" />
			<h2 class="mt-3 font-medium text-fg">Calendar</h2>
			<p class="mt-1 text-xs text-fg-muted">Coming soon</p>
		</div>

		<div class="z-panel rounded-xl p-5 opacity-50">
			<Users class="size-6 text-fg-subtle" aria-hidden="true" />
			<h2 class="mt-3 font-medium text-fg">Contacts</h2>
			<p class="mt-1 text-xs text-fg-muted">Coming soon</p>
		</div>
	</div>

	<Button href="/mail/inbox">Open inbox</Button>
</div>
