<script lang="ts">
	import { prefs, setPref } from '#lib/settings.svelte.ts';
	import { countryName } from '#lib/calendar/holidays';
	import { holidayCountries } from '../../../routes/holidays.remote';

	/** The holidays calendar's one setting: whose. `detected` is the country the browser's language names. */
	let { detected, onClose }: { detected: string | null; onClose: () => void } = $props();

	const countries = holidayCountries();
	const label = 'block text-[12px] text-[var(--z-soft)]';
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-4">
		<h2 class="min-w-0 truncate text-[14px] font-semibold text-[var(--z-ink)]">Holidays</h2>
		<button type="button" class="btn-tactile !h-[30px] shrink-0" onclick={onClose}>Done</button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-4">
			<label>
				<span class={label}>Country</span>
				<select
					class="z-field mt-1 w-full max-md:text-base"
					value={prefs.holidayCountry}
					onchange={(changed) => setPref('holidayCountry', changed.currentTarget.value)}
				>
					<option value="">Automatic{detected ? ` (${countryName(detected)})` : ''}</option>
					<option value="none">None</option>
					{#each countries.current ?? [] as country (country.code)}
						<option value={country.code}>{country.name}</option>
					{/each}
					<!-- Before the list is in, the chosen country still has to show. -->
					{#if !countries.current && prefs.holidayCountry && prefs.holidayCountry !== 'none'}
						<option value={prefs.holidayCountry}>{countryName(prefs.holidayCountry)}</option>
					{/if}
				</select>
			</label>
			<p class="text-[12.5px] text-[var(--z-muted)]">
				Nationwide public holidays, from <a class="underline" href="https://date.nager.at" target="_blank" rel="noreferrer">Nager.Date</a>. Read-only; to hide them, untick the calendar.
			</p>
		</div>
	</div>
</div>
