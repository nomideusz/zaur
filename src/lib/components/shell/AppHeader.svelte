<script lang="ts">
	import { page } from '$app/stores';
	import { PenSquare } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import GlobalSearch from './GlobalSearch.svelte';
	import ToolSwitcher from './ToolSwitcher.svelte';
	import UserMenu from './UserMenu.svelte';
</script>

<header
	class="z-panel flex h-(--height-header) shrink-0 items-center gap-4 border-b px-4"
	style="view-transition-name: app-header;"
>
	<a href="/" class="text-base font-semibold tracking-tight text-fg">ZAUR</a>

	<ToolSwitcher />

	<div class="flex-1">
		<GlobalSearch />
	</div>

	{#if $page.url.pathname.startsWith('/mail')}
		<Button href="/mail/compose" class="hidden sm:inline-flex">
			<PenSquare class="size-4" aria-hidden="true" />
			New
		</Button>
	{/if}

	<UserMenu />
</header>
