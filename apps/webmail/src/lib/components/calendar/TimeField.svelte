<script lang="ts">
	/**
	 * Time input that swaps control by layout: the native `<input type="time">`
	 * on desktop (pointer + keyboard beat a wheel), an STDF wheel picker on
	 * phones, where the OS time control is a modal that hides the form.
	 *
	 * Exactly one of the two is in the DOM at a time — a `required` field
	 * hidden with CSS makes the form unsubmittable and unfocusable in Chrome.
	 */
	import { TimePicker } from 'stdf';
	import { isMobileLayout } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';

	interface Props {
		value: string;
		invalid?: boolean;
		describedby?: string;
		label: string;
	}

	let { value = $bindable(), invalid = false, describedby, label }: Props = $props();

	let mobile = $state(false);
	let open = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		mobile = mq.matches;
		const sync = (event: MediaQueryListEvent) => (mobile = event.matches);
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	/* Server render and first paint use the native control; isMobileLayout()
	   is false without a window, so nothing flashes on desktop. */
	const useWheel = $derived(mobile || isMobileLayout());

	const parts = $derived((value || '09:00').split(':'));
</script>

{#if useWheel}
	<!-- aria-invalid isn't valid on a button; the danger border plus the
	     described-by hint carry the error state instead. -->
	<button
		type="button"
		class={cn('z-input text-left tabular-nums', invalid && 'border-danger')}
		aria-describedby={describedby}
		aria-label="{label}: {value || 'not set'}"
		onclick={() => (open = true)}
	>
		{value || 'Select time'}
	</button>
	<TimePicker
		bind:visible={open}
		type="hhmm"
		title={label}
		initHour={parts[0]}
		initMinute={parts[1]}
		minuteStep={5}
		hourProps={{ showRow: 7 }}
		minuteProps={{ showRow: 7 }}
		onconfirm={(timeStr: string) => (value = timeStr)}
	/>
{:else}
	<input
		type="time"
		class="z-input"
		aria-invalid={invalid ? 'true' : undefined}
		aria-describedby={describedby}
		bind:value
		required
	/>
{/if}
