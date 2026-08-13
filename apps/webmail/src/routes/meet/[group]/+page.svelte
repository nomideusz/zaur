<script lang="ts">
	import MeetRoom from '$lib/components/meet/MeetRoom.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data, form } = $props();

	const session = $derived(form && 'token' in form && form.token ? form : data);
	const ready = $derived(Boolean(session.token && session.wsUrl && !session.needsName));
</script>

<svelte:head>
	<title>Zaur Meet</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if ready}
	<MeetRoom wsUrl={session.wsUrl} token={session.token} displayName={session.name} />
{:else}
	<main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
		<p class="text-sm font-semibold tracking-tight text-fg-subtle">Zaur Meet</p>
		<h1 class="mt-2 text-xl font-semibold text-fg">Join call</h1>
		<p class="mt-2 text-sm text-fg-muted">Enter the name others will see in the room.</p>
		{#if form && 'message' in form && form.message}
			<p class="mt-3 text-sm text-danger">{form.message}</p>
		{/if}
		<form method="POST" class="mt-6 space-y-4">
			<label class="block text-sm font-medium text-fg">
				Name
				<input
					class="z-input mt-1 w-full"
					name="name"
					type="text"
					autocomplete="nickname"
					required
					maxlength="64"
				/>
			</label>
			<Button type="submit" class="w-full">Join</Button>
		</form>
	</main>
{/if}
