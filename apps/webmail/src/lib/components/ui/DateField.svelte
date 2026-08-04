<script lang="ts">
	import { DatePicker, parseDate, type DateValue } from '@ark-ui/svelte/date-picker';
	import { Portal } from '@ark-ui/svelte/portal';
	import Calendar from '$lib/components/icons/Calendar.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** ISO date `YYYY-MM-DD`, or empty when unset. */
		value?: string;
		id?: string;
		disabled?: boolean;
		required?: boolean;
		invalid?: boolean;
		min?: string;
		max?: string;
		/** Match calendar settings — Monday when true, Sunday otherwise. */
		weekStartsOnMonday?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		id,
		disabled = false,
		required = false,
		invalid = false,
		min = '',
		max = '',
		weekStartsOnMonday = false,
		class: className = '',
		onchange
	}: Props = $props();

	function parseIso(iso: string): DateValue | undefined {
		if (!iso) return undefined;
		try {
			return parseDate(iso);
		} catch {
			return undefined;
		}
	}

	const pickerValue = $derived.by(() => {
		const parsed = parseIso(value);
		return parsed ? [parsed] : [];
	});
	const minValue = $derived(parseIso(min));
	const maxValue = $derived(parseIso(max));

	function emit(next: DateValue[]) {
		const iso = next[0]?.toString() ?? '';
		value = iso;
		onchange?.(iso);
	}
</script>

<!--
	Ark DatePicker bound to ISO `YYYY-MM-DD` strings used across settings,
	search, and calendar compose. Calendar popover is portaled.
-->
<DatePicker.Root
	value={pickerValue}
	min={minValue}
	max={maxValue}
	startOfWeek={weekStartsOnMonday ? 1 : 0}
	closeOnSelect
	{disabled}
	class={cn('z-date-field', invalid && 'z-date-field--invalid', className)}
	onValueChange={(details) => emit(details.value)}
>
	<DatePicker.Control class="z-date-field__control">
		<DatePicker.Input
			{id}
			class="z-date-field__input z-input"
			{required}
			aria-invalid={invalid || undefined}
		/>
		<DatePicker.Trigger class="z-date-field__trigger" aria-label="Open calendar">
			<Calendar class="size-4" aria-hidden="true" />
		</DatePicker.Trigger>
	</DatePicker.Control>

	<Portal>
		<DatePicker.Positioner class="z-date-field__positioner">
			<DatePicker.Content class="z-date-field__content">
				<DatePicker.View view="day">
					<DatePicker.Context>
						{#snippet render(api)}
							{@const datePicker = api()}
							<DatePicker.ViewControl class="z-date-field__view-control">
								<DatePicker.PrevTrigger class="z-date-field__nav" aria-label="Previous month">
									<ChevronLeft class="size-4" aria-hidden="true" />
								</DatePicker.PrevTrigger>
								<DatePicker.ViewTrigger class="z-date-field__view-trigger">
									<DatePicker.RangeText />
								</DatePicker.ViewTrigger>
								<DatePicker.NextTrigger class="z-date-field__nav" aria-label="Next month">
									<ChevronRight class="size-4" aria-hidden="true" />
								</DatePicker.NextTrigger>
							</DatePicker.ViewControl>
							<DatePicker.Table class="z-date-field__table">
								<DatePicker.TableHead>
									<DatePicker.TableRow>
										{#each datePicker.weekDays as weekDay (weekDay.short)}
											<DatePicker.TableHeader class="z-date-field__weekday">
												{weekDay.short}
											</DatePicker.TableHeader>
										{/each}
									</DatePicker.TableRow>
								</DatePicker.TableHead>
								<DatePicker.TableBody>
									{#each datePicker.weeks as week, weekIndex (weekIndex)}
										<DatePicker.TableRow>
											{#each week as day (day.toString())}
												<DatePicker.TableCell value={day}>
													<DatePicker.TableCellTrigger class="z-date-field__day">
														{day.day}
													</DatePicker.TableCellTrigger>
												</DatePicker.TableCell>
											{/each}
										</DatePicker.TableRow>
									{/each}
								</DatePicker.TableBody>
							</DatePicker.Table>
						{/snippet}
					</DatePicker.Context>
				</DatePicker.View>

				<DatePicker.View view="month">
					<DatePicker.Context>
						{#snippet render(api)}
							{@const datePicker = api()}
							<DatePicker.ViewControl class="z-date-field__view-control">
								<DatePicker.PrevTrigger class="z-date-field__nav" aria-label="Previous year">
									<ChevronLeft class="size-4" aria-hidden="true" />
								</DatePicker.PrevTrigger>
								<DatePicker.ViewTrigger class="z-date-field__view-trigger">
									<DatePicker.RangeText />
								</DatePicker.ViewTrigger>
								<DatePicker.NextTrigger class="z-date-field__nav" aria-label="Next year">
									<ChevronRight class="size-4" aria-hidden="true" />
								</DatePicker.NextTrigger>
							</DatePicker.ViewControl>
							<DatePicker.Table class="z-date-field__table">
								<DatePicker.TableBody>
									{#each datePicker.getMonthsGrid({ columns: 4, format: 'short' }) as months, rowIndex (rowIndex)}
										<DatePicker.TableRow>
											{#each months as month (month.value)}
												<DatePicker.TableCell value={month.value}>
													<DatePicker.TableCellTrigger class="z-date-field__cell">
														{month.label}
													</DatePicker.TableCellTrigger>
												</DatePicker.TableCell>
											{/each}
										</DatePicker.TableRow>
									{/each}
								</DatePicker.TableBody>
							</DatePicker.Table>
						{/snippet}
					</DatePicker.Context>
				</DatePicker.View>

				<DatePicker.View view="year">
					<DatePicker.Context>
						{#snippet render(api)}
							{@const datePicker = api()}
							<DatePicker.ViewControl class="z-date-field__view-control">
								<DatePicker.PrevTrigger class="z-date-field__nav" aria-label="Previous years">
									<ChevronLeft class="size-4" aria-hidden="true" />
								</DatePicker.PrevTrigger>
								<DatePicker.ViewTrigger class="z-date-field__view-trigger">
									<DatePicker.RangeText />
								</DatePicker.ViewTrigger>
								<DatePicker.NextTrigger class="z-date-field__nav" aria-label="Next years">
									<ChevronRight class="size-4" aria-hidden="true" />
								</DatePicker.NextTrigger>
							</DatePicker.ViewControl>
							<DatePicker.Table class="z-date-field__table">
								<DatePicker.TableBody>
									{#each datePicker.getYearsGrid({ columns: 4 }) as years, rowIndex (rowIndex)}
										<DatePicker.TableRow>
											{#each years as year (year.value)}
												<DatePicker.TableCell value={year.value}>
													<DatePicker.TableCellTrigger class="z-date-field__cell">
														{year.label}
													</DatePicker.TableCellTrigger>
												</DatePicker.TableCell>
											{/each}
										</DatePicker.TableRow>
									{/each}
								</DatePicker.TableBody>
							</DatePicker.Table>
						{/snippet}
					</DatePicker.Context>
				</DatePicker.View>
			</DatePicker.Content>
		</DatePicker.Positioner>
	</Portal>
</DatePicker.Root>
