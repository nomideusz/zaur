<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { MoreHorizontal } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	export let link: string;
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger asChild let:builder>
		<Button variant="ghost" builders={[builder]} size="icon" class="relative h-8 w-8 p-0">
			<span class="sr-only">Open menu</span>
			<MoreHorizontal class="h-4 w-4" />
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<DropdownMenu.Group>
			<DropdownMenu.Label>Akcje</DropdownMenu.Label>
			<DropdownMenu.Item
				><a href={link} title={link} target="_blank">Odwiedź ogłoszenie</a></DropdownMenu.Item
			>
		</DropdownMenu.Group>
		<DropdownMenu.Separator />
		<DropdownMenu.Item
			on:click={() => {
				navigator.clipboard.writeText(link);
				toast.success('Zaur umieścił link w schowku.');
			}}
		>
			Kopiuj link
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
