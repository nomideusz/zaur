<script lang="ts" context="module">
	import { z } from 'zod';

	export const formSchema = z.object({
		minPrice: z
			.string()
			.refine(
				(val) => {
					const number = Number(val.replace(/\s/g, ''));
					return !isNaN(number) && number >= 0; // Umożliwia wartości >= 0
				},
				{
					message: 'Wartość musi być liczbą większą lub równą 0.'
				}
			)
			.refine((val) => Number(val.replace(/\s/g, '')) <= 99999999, {
				message: 'Jest to zbyt masywna suma.'
			})
			.nullish(),

		maxPrice: z
			.string()
			.refine(
				(val) => {
					const number = Number(val.replace(/\s/g, ''));
					return !isNaN(number) && number >= 0; // Umożliwia wartości >= 0
				},
				{
					message: 'Wartość musi być liczbą większą lub równą 0.'
				}
			)
			.refine((val) => Number(val.replace(/\s/g, '')) <= 99999999, {
				message: 'Jest to zbyt masywna suma.'
			})
			.nullish(),
		minPricePerSqm: z
			.string()
			.refine(
				(val) => {
					const number = Number(val.replace(/\s/g, ''));
					return !isNaN(number) && number >= 0; // Umożliwia wartości >= 0
				},
				{
					message: 'Wartość musi być liczbą większą lub równą 0.'
				}
			)
			.refine((val) => Number(val.replace(/\s/g, '')) <= 99999999, {
				message: 'Jest to zbyt masywna suma.'
			})
			.nullish(),
		maxPricePerSqm: z
			.string()
			.refine(
				(val) => {
					const number = Number(val.replace(/\s/g, ''));
					return !isNaN(number) && number >= 0; // Umożliwia wartości >= 0
				},
				{
					message: 'Wartość musi być liczbą większą lub równą 0.'
				}
			)
			.refine((val) => Number(val.replace(/\s/g, '')) <= 99999999, {
				message: 'Jest to zbyt masywna suma.'
			})
			.nullish(),
		minArea: z
			.string()
			.refine(
				(val) => {
					const number = Number(val.replace(/\s/g, ''));
					return !isNaN(number) && number >= 0; // Umożliwia wartości >= 0
				},
				{
					message: 'Wartość musi być liczbą większą lub równą 0.'
				}
			)
			.refine((val) => Number(val.replace(/\s/g, '')) <= 99999999, {
				message: 'Jest to zbyt masywna powierzchnia.'
			})
			.nullish(),
		maxArea: z
			.string()
			.refine(
				(val) => {
					const number = Number(val.replace(/\s/g, ''));
					return !isNaN(number) && number >= 0; // Umożliwia wartości >= 0
				},
				{
					message: 'Wartość musi być liczbą większą lub równą 0.'
				}
			)
			.refine((val) => Number(val.replace(/\s/g, '')) <= 99999999, {
				message: 'Jest to zbyt masywna powierzchnia.'
			})
			.nullish()
	});

	export type FormSchema = typeof formSchema;
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import * as Form from '$lib/components/ui/form/index.js';
	import SuperDebug, {
		type SuperValidated,
		type Infer,
		superForm,
		defaults
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Drawer from '$lib/components/ui/drawer';
	import { PlusCircled, Check } from 'radix-icons-svelte';
	import { mediaQuery } from 'svelte-legos';
	import { formatter, squareMeterFormatter } from '$lib/utils/formatter';
	import { PlusCircle } from 'lucide-svelte';

	export let priceFilterValues: number[] | null[] = [];
	export let pricePerSqmFilterValues: number[] | null[] = [];
	export let areaFilterValues: number[] | null[] = [];
	// export let minPrice: number,
	// 	maxPrice: number,
	// 	minPricePerSqm: number,
	// 	maxPricePerSqm: number,
	// 	minArea: number,
	// 	maxArea: number;
	export let title: string;
	let open = false;
	let minPriceInput = '';
	let maxPriceInput = '';
	let minPricePerSqmInput = '';
	let maxPricePerSqmInput = '';
	let minAreaInput = '';
	let maxAreaInput = '';

	$: formattedMinPrice = formatter(validateInput(minPriceInput));
	$: formattedMaxPrice = formatter(validateInput(maxPriceInput));
	$: formattedMinPricePerSqm = formatter(validateInput(minPricePerSqmInput));
	$: formattedMaxPricePerSqm = formatter(validateInput(maxPricePerSqmInput));
	$: formattedMinArea = squareMeterFormatter(validateInput(minAreaInput));
	$: formattedMaxArea = squareMeterFormatter(validateInput(maxAreaInput));
	const isDesktop = mediaQuery('(min-width: 768px)');
	const form = superForm(defaults(zodClient(formSchema)), {
		SPA: true,
		validators: zodClient(formSchema),
		resetForm: false,
		onChange(event) {
			if (event.target) {
				// Form input event
				console.log(event.path, 'was changed from', event.target, 'in form', event.formElement);
			} else {
				// Programmatic event
				console.log('Fields updated:', event.paths);
			}
		},
		onUpdate: ({ form: f }) => {
			Object.keys(f.data).forEach((key) => {
				const value = f.data[key];
				if (value === '') {
					delete f.data[key];
				} else if (typeof value === 'string' && !isNaN(Number(value))) {
					f.data[key] = formatNumberWithSpaces(value);
				}
			});
			if (f.valid) {
				open = false;
				let formDataLength = Object.keys(f.data).length;
				if (formDataLength > 0) {
					toast.success('Zastosowano filtry.');
				} else {
					toast.info('Nie wprowadzono żadnego filtra.');
				}
				const validatedMinPrice = validateInput($formData.minPrice);
				priceFilterValues[0] = validatedMinPrice ?? null;
				const validatedMaxPrice = validateInput($formData.maxPrice);
				priceFilterValues[1] = validatedMaxPrice ?? null;
				const validatedMinPricePerSqm = validateInput($formData.minPricePerSqm);
				pricePerSqmFilterValues[0] = validatedMinPricePerSqm ?? null;
				const validatedMaxPricePerSqm = validateInput($formData.maxPricePerSqm);
				pricePerSqmFilterValues[1] = validatedMaxPricePerSqm ?? null;
				const validatedMinArea = validateInput($formData.minArea);
				areaFilterValues[0] = validatedMinArea ?? null;
				const validatedMaxArea = validateInput($formData.maxArea);
				areaFilterValues[1] = validatedMaxArea ?? null;
			} else {
				toast.error('Zaur wykrył problem z formularzem i prosi o lepsze jego używanie.');
			}
		}
	});

	const { form: formData, errors, enhance } = form;

	function validateInput(inputValue: string | undefined | null): number | null | undefined {
		if (inputValue === undefined || inputValue === null) {
			return null; // Nie podano wartości
		}

		const valueWithoutSpaces = inputValue.replace(/\s/g, '');

		if (valueWithoutSpaces === '') {
			return null; // Użytkownik nic nie wpisał, ale to jest akceptowalne
		}

		const numberValue = Number(valueWithoutSpaces);
		if (!isNaN(numberValue)) {
			return numberValue; // Wartość jest prawidłową liczbą, w tym 0
		} else {
			return null; // Wartość nie jest liczbą
		}
	}

	function formatNumberWithSpaces(value: string): string {
		// Usuń wszystkie spacje, a następnie dodaj spacje co trzy cyfry
		const onlyNums = value.replace(/\D+/g, ''); // Usuwa nie-cyfry
		return onlyNums.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	}
	function handleInputChange(event: Event, type: string) {
		const target = event.target as HTMLInputElement;
		const formattedValue = formatNumberWithSpaces(target.value);

		switch (type) {
			case 'minPrice':
				minPriceInput = formattedValue;
				$formData.minPrice = formattedValue;
				break;
			case 'maxPrice':
				maxPriceInput = formattedValue;
				$formData.maxPrice = formattedValue;
				break;
			case 'minPricePerSqm':
				minPricePerSqmInput = formattedValue;
				$formData.minPricePerSqm = formattedValue;
				break;
			case 'maxPricePerSqm':
				maxPricePerSqmInput = formattedValue;
				$formData.maxPricePerSqm = formattedValue;
				break;
			case 'minArea':
				minAreaInput = formattedValue;
				$formData.minArea = formattedValue;
				break;
			case 'maxArea':
				maxAreaInput = formattedValue;
				$formData.maxArea = formattedValue;
				break;
		}
	}
</script>

{#if $isDesktop}
	<Dialog.Root bind:open onOpenChange={(o) => (open = o)} closeOnOutsideClick={false}>
		<Dialog.Trigger asChild let:builder>
			<Button builders={[builder]} variant="outline" class="border-dashed font-bold">
				<PlusCircle class="mr-2 h-4 w-4" />
				{title}
				{#if priceFilterValues[0] != null || priceFilterValues[1] != null}
					<Separator orientation="vertical" class="mx-2 h-4" />
					<div class="hidden space-x-1 lg:flex">
						{#if priceFilterValues[0] != null && priceFilterValues[0] != undefined}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								cena min {formattedMinPrice}
							</Badge>
						{/if}
						{#if priceFilterValues[1] != null && priceFilterValues[1] != undefined}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								cena max {formattedMaxPrice}
							</Badge>
						{/if}
					</div>
				{/if}
				{#if pricePerSqmFilterValues[0] != null || pricePerSqmFilterValues[1] != null}
					<Separator orientation="vertical" class="mx-2 h-4" />
					<div class="hidden space-x-1 lg:flex">
						{#if pricePerSqmFilterValues[0] != null && pricePerSqmFilterValues[0] != undefined}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								cena za m<sup>2 </sup>&nbsp;min {formattedMinPricePerSqm}
							</Badge>
						{/if}
						{#if pricePerSqmFilterValues[1] != null && pricePerSqmFilterValues[1] != undefined}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								cena za m<sup>2</sup>&nbsp;max {formattedMaxPricePerSqm}
							</Badge>
						{/if}
					</div>
				{/if}
				{#if areaFilterValues[0] != null || areaFilterValues[1] != null}
					<Separator orientation="vertical" class="mx-2 h-4" />
					<div class="hidden space-x-1 lg:flex">
						{#if areaFilterValues[0] != null && areaFilterValues[0] != undefined}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								powierzchnia min {formattedMinArea}
							</Badge>
						{/if}
						{#if areaFilterValues[1] != null && areaFilterValues[1] != undefined}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								powierzchnia max {formattedMaxArea}
							</Badge>
						{/if}
					</div>
				{/if}
			</Button>
		</Dialog.Trigger>
		<Dialog.Content class="justify-center">
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Description>
					Zaur pozwala na precyzyjne filtrowanie ogłoszeń. Taki właśnie jest Zaur.
				</Dialog.Description>
			</Dialog.Header>

			<form method="POST" use:enhance>
				<div class="flex items-center gap-x-4">
					<Form.Field {form} name="minPrice">
						<Form.Control let:attrs>
							<Form.Label>Minimalna cena</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.minPrice}
									on:input={(event) => handleInputChange(event, 'minPrice')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="maxPrice">
						<Form.Control let:attrs>
							<Form.Label>Maksymalna cena</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.maxPrice}
									on:input={(event) => handleInputChange(event, 'maxPrice')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="flex items-center gap-x-4">
					<Form.Field {form} name="minPricePerSqm">
						<Form.Control let:attrs>
							<Form.Label>Minimalna cena za m<sup>2</sup></Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.minPricePerSqm}
									on:input={(event) => handleInputChange(event, 'minPricePerSqm')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="maxPricePerSqm">
						<Form.Control let:attrs>
							<Form.Label>Maksymalna cena za m<sup>2</sup></Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.maxPricePerSqm}
									on:input={(event) => handleInputChange(event, 'maxPricePerSqm')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="flex items-center gap-x-4">
					<Form.Field {form} name="minArea">
						<Form.Control let:attrs>
							<Form.Label>Minimalna powierzchnia</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.minArea}
									on:input={(event) => handleInputChange(event, 'minArea')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									m<sup>2</sup>
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="maxArea">
						<Form.Control let:attrs>
							<Form.Label>Maksymalna powierzchnia</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.maxArea}
									on:input={(event) => handleInputChange(event, 'maxArea')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									m<sup>2</sup>
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="mt-4 flex items-center space-x-4">
					<Form.Button>Zastosuj filtry</Form.Button>
					<Button
						on:click={() => {
							$formData = {};
						}}>Wyczyść filtry</Button
					>
				</div>
			</form>
			<!-- {#if browser}
				<SuperDebug data={$formData} />
			{/if} -->
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger asChild let:builder>
			<PlusCircled class="mr-2 h-4 w-4" />
			<Button variant="outline" builders={[builder]} class="border-dashed font-bold">
				<PlusCircle class="mr-2 h-4 w-4" />{title}
			</Button>
		</Drawer.Trigger>
		<Drawer.Content class="mx-auto justify-center px-4">
			<Drawer.Header class="justify-center text-left">
				<Drawer.Title>{title}</Drawer.Title>
				<Drawer.Description>
					Zaur pozwala na precyzyjne filtrowanie ogłoszeń. Taki właśnie jest Zaur.
				</Drawer.Description>
			</Drawer.Header>
			<form method="POST" use:enhance>
				<div class="flex items-center justify-center gap-4">
					<Form.Field {form} name="minPrice">
						<Form.Control let:attrs>
							<Form.Label>Minimalna cena</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.minPrice}
									on:input={(event) => handleInputChange(event, 'minPrice')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="maxPrice">
						<Form.Control let:attrs>
							<Form.Label>Maksymalna cena</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.maxPrice}
									on:input={(event) => handleInputChange(event, 'maxPrice')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="flex items-center justify-center gap-x-4">
					<Form.Field {form} name="minPricePerSqm">
						<Form.Control let:attrs>
							<Form.Label>Minimalna cena za m<sup>2</sup></Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.minPricePerSqm}
									on:input={(event) => handleInputChange(event, 'minPricePerSqm')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="maxPricePerSqm">
						<Form.Control let:attrs>
							<Form.Label>Maksymalna cena za m<sup>2</sup></Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.maxPricePerSqm}
									on:input={(event) => handleInputChange(event, 'maxPricePerSqm')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									zł
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="flex items-center justify-center gap-x-4">
					<Form.Field {form} name="minArea">
						<Form.Control let:attrs>
							<Form.Label>Minimalna powierzchnia</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.minArea}
									on:input={(event) => handleInputChange(event, 'minArea')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									m<sup>2</sup>
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="maxArea">
						<Form.Control let:attrs>
							<Form.Label>Maksymalna powierzchnia</Form.Label>
							<div class="relative">
								<Input
									type="text"
									{...attrs}
									bind:value={$formData.maxArea}
									on:input={(event) => handleInputChange(event, 'maxArea')}
									class="pr-10"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 text-xs text-muted-foreground"
								>
									m<sup>2</sup>
								</span>
							</div>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Form.Button class="mx-auto mt-2 flex justify-center">Zastosuj filtry</Form.Button>
			</form>
			<Drawer.Footer class="mx-auto justify-center pt-2">
				<Drawer.Close asChild let:builder>
					<Button class="max-w-min" variant="outline" builders={[builder]}>Anuluj</Button>
				</Drawer.Close>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
{/if}
