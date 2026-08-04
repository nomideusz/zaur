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

	// #region agent log
	function dbg(hypothesisId: string, location: string, message: string, data: Record<string, unknown> = {}) {
		const payload = { hypothesisId, location, message, data, timestamp: Date.now() };
		try {
			fetch('/api/__debug_log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}).catch(() => {});
		} catch {
			/* ignore */
		}
		console.info('[DBG-DateField]', hypothesisId, location, message, data);
	}

	function logTriggerPointer(e: PointerEvent | MouseEvent, kind: string) {
		const t = e.currentTarget as HTMLElement | null;
		const cs = t ? getComputedStyle(t) : null;
		const rect = t?.getBoundingClientRect();
		dbg('A,D', `DateField.svelte:trigger:${kind}`, `Trigger ${kind}`, {
			type: e.type,
			defaultPrevented: e.defaultPrevented,
			eventPhase: e.eventPhase,
			button: 'button' in e ? e.button : undefined,
			pointerType: 'pointerType' in e ? e.pointerType : undefined,
			targetTag: (e.target as HTMLElement | null)?.tagName,
			currentTag: t?.tagName,
			dataState: t?.getAttribute('data-state'),
			ariaExpanded: t?.getAttribute('aria-expanded'),
			disabledAttr: t?.hasAttribute('disabled'),
			pointerEvents: cs?.pointerEvents,
			visibility: cs?.visibility,
			display: cs?.display,
			zIndex: cs?.zIndex,
			rect: rect
				? { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
				: null,
			isoValue: value,
			pickerLen: pickerValue.length,
			disabled
		});
	}
	// #endregion
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
	onValueChange={(details) => {
		// #region agent log
		dbg('C', 'DateField.svelte:onValueChange', 'value change', {
			next: details.value?.map((d) => d.toString()) ?? [],
			isoBound: value
		});
		// #endregion
		emit(details.value);
	}}
	onOpenChange={(details) => {
		// #region agent log
		dbg('B,C', 'DateField.svelte:onOpenChange', 'open change', {
			open: details.open,
			isoBound: value,
			pickerLen: pickerValue.length,
			hasMin: !!minValue,
			hasMax: !!maxValue,
			disabled
		});
		// #endregion
	}}
>
	<DatePicker.Control class="z-date-field__control">
		<DatePicker.Input
			{id}
			class="z-date-field__input z-input"
			{required}
			aria-invalid={invalid || undefined}
		/>
		<DatePicker.Trigger
			class="z-date-field__trigger"
			aria-label="Open calendar"
			onpointerdown={(e) => {
				// #region agent log
				logTriggerPointer(e, 'pointerdown');
				// #endregion
			}}
			onclick={(e) => {
				// #region agent log
				logTriggerPointer(e, 'click');
				queueMicrotask(() => {
					const trigger = document.querySelector(
						'[data-scope="date-picker"][data-part="trigger"][data-state="open"]'
					) as HTMLElement | null;
					const content = document.querySelector(
						'[data-scope="date-picker"][data-part="content"][data-state="open"]'
					) as HTMLElement | null;
					const positioner = content?.closest(
						'[data-scope="date-picker"][data-part="positioner"]'
					) as HTMLElement | null;
					const cr = content?.getBoundingClientRect();
					const y =
						positioner?.style.getPropertyValue('--y') ||
						getComputedStyle(positioner ?? document.documentElement).getPropertyValue('--y');
					dbg('E', 'DateField.svelte:trigger:click:after', 'post-click layout', {
						runId: 'post-fix',
						dataState: trigger?.getAttribute('data-state'),
						ariaExpanded: trigger?.getAttribute('aria-expanded'),
						contentInDom: !!content,
						contentW: cr ? Math.round(cr.width) : null,
						contentH: cr ? Math.round(cr.height) : null,
						contentY: cr ? Math.round(cr.y) : null,
						positionerY: y?.trim() || null,
						inViewport: !!(
							cr &&
							cr.width > 0 &&
							cr.height > 0 &&
							cr.y > -cr.height &&
							cr.y < window.innerHeight
						)
					});
				});
				// #endregion
			}}
		>
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
