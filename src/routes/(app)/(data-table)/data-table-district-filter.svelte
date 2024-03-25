<script lang="ts">
	import { PlusCircled } from 'radix-icons-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { mediaQuery } from 'svelte-legos';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	export let filterValues: string[] = [];
	export let title: string;
	export let options = []; // Lista opcji w formacie { value: string, label: string }

	let open = false;
	const isDesktop = mediaQuery('(min-width: 768px)');

	function addItem(value: string) {
		filterValues = [...filterValues, value];
	}

	function removeItem(value: string) {
		filterValues = filterValues.filter((i) => i !== value);
	}
</script>

{#if $isDesktop}
	<Dialog.Root bind:open onOpenChange={(o) => (open = o)} closeOnOutsideClick={false}>
		<Dialog.Trigger asChild let:builder>
			<Button builders={[builder]} variant="outline" class="border-dashed font-bold">
				<PlusCircled class="mr-2 h-4 w-4" />
				{title}
				{#if filterValues.length > 0}
					<Separator orientation="vertical" class="mx-2 h-4" />
					<Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
						{filterValues.length}
					</Badge>
					<div class="hidden space-x-1 lg:flex">
						{#if filterValues.length > 2}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								{filterValues.length} Selected
							</Badge>
						{:else}
							{#each filterValues as option}
								<Badge variant="secondary" class="rounded-sm px-1 font-normal">
									{option}
								</Badge>
							{/each}
						{/if}
					</div>
				{/if}
			</Button>
		</Dialog.Trigger>
		<Dialog.Content class="justify-center">
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Description>
					Filtrowanie wg dzielnicy — dzięki uprzejmości Zaura.
				</Dialog.Description>
			</Dialog.Header>
			<div class="my-4 columns-2 gap-8 space-y-4">
				{#each options as option}
					{@const checked = filterValues.includes(option.value)}
					<div class="flex items-center space-x-2">
						<Checkbox
							id={`district-${option.value}`}
							{checked}
							onCheckedChange={(v) => {
								if (v) {
									addItem(option.value);
								} else {
									removeItem(option.value);
								}
							}}
							aria-labelledby={`label-for-${option.value}`}
						/>
						<Label
							id={`label-for-${option.value}`}
							for={`district-${option.value}`}
							class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							{option.label}
						</Label>
					</div>
				{/each}
			</div>
			<div class="flex items-center space-x-4">
				<Button
					on:click={() => {
						if (filterValues.length > 0) {
							toast.success('Zastosowano filtry.');
						} else {
							toast.info('Nie wprowadzono żadnego filtra.');
						}
						open = false;
					}}>Zastosuj filtry</Button
				>
				<Button
					on:click={() => {
						filterValues = [];
					}}>Wyczyść filtry</Button
				>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger asChild let:builder>
			<PlusCircled class="mr-2 h-4 w-4" />
			<Button variant="outline" builders={[builder]} class="border-dashed font-bold">
				<PlusCircled class="mr-2 h-4 w-4" />{title}
			</Button>
		</Drawer.Trigger>
		<Drawer.Content class="mx-auto justify-center px-4 pb-8 pt-4">
			<Drawer.Header class="justify-left pt-8 text-left">
				<Drawer.Title>{title}</Drawer.Title>
				<Drawer.Description>
					Filtrowanie wg dzielnicy — dzięki uprzejmości Zaura.
				</Drawer.Description>
			</Drawer.Header>
			<div class="mx-4 mb-8 mt-4 columns-2 gap-8 space-y-4">
				{#each options as option}
					{@const checked = filterValues.includes(option.value)}
					<div class="flex items-center space-x-2">
						<Checkbox
							id={`district-${option.value}`}
							{checked}
							onCheckedChange={(v) => {
								if (v) {
									addItem(option.value);
								} else {
									removeItem(option.value);
								}
							}}
							aria-labelledby={`label-for-${option.value}`}
						/>
						<Label
							id={`label-for-${option.value}`}
							for={`district-${option.value}`}
							class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							{option.label}
						</Label>
					</div>
				{/each}
			</div>
			<div class="flex items-center justify-between space-x-4">
				<Button
					class="grow"
					on:click={() => {
						if (filterValues.length > 0) {
							toast.success('Zastosowano filtry.');
						} else {
							toast.info('Nie wprowadzono żadnego filtra.');
						}
						open = false;
					}}>Zastosuj filtry</Button
				>
				<Button
					class="grow"
					on:click={() => {
						filterValues = [];
					}}>Wyczyść filtry</Button
				>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
