<script lang="ts">
	import { prefs, setPref, THEMES, LIST_MIN, LIST_MAX, DEFAULT_PREFS } from '#lib/settings.svelte.ts';
</script>

<!-- Not synced on purpose: a theme and a pixel width mean something different on a different screen. -->
<section class="z-card">
	<div class="divide-y divide-[var(--z-hairline)]">
		<div class="flex items-center justify-between gap-4 px-4 py-3 max-md:flex-wrap">
			<span class="block text-[13.5px] font-medium text-[var(--z-body)]">Theme</span>
			<div class="z-group" role="group" aria-label="Theme">
				{#each THEMES as theme (theme)}
					<button type="button" class="z-segment !h-[28px] !px-[10px] capitalize" aria-pressed={prefs.theme === theme} onclick={() => setPref('theme', theme)}>
						{theme}
					</button>
				{/each}
			</div>
		</div>

		<label class="flex items-center justify-between gap-4 px-4 py-3 max-md:hidden">
			<span class="min-w-0">
				<span class="block text-[13.5px] font-medium text-[var(--z-body)]">Message list width</span>
				<span class="mt-[1px] block text-[12px] text-[var(--z-soft)]">Or drag the edge between the list and the message.</span>
			</span>
			<span class="flex items-center gap-2.5">
				<input
					type="range"
					min={LIST_MIN}
					max={LIST_MAX}
					step="10"
					class="z-range w-40"
					value={prefs.listWidth}
					oninput={(event) => setPref('listWidth', Number(event.currentTarget.value))}
				/>
				<span class="z-mono w-[52px] text-right text-[11px] text-[var(--z-muted)]">{prefs.listWidth}px</span>
			</span>
		</label>
	</div>
	<div class="z-card-foot justify-end">
		<button
			type="button"
			class="btn-tactile !h-7 !text-[12px]"
			onclick={() => {
				setPref('theme', DEFAULT_PREFS.theme);
				setPref('listWidth', DEFAULT_PREFS.listWidth);
			}}
		>
			Reset appearance
		</button>
	</div>
</section>

<style>
	/* The slider: a 7px track, the accent for the filled part, a tactile thumb. */
	.z-range {
		appearance: none;
		height: 7px;
		border-radius: 999px;
		background: var(--z-hairline);
		outline-offset: 4px;
	}

	.z-range::-webkit-slider-thumb {
		appearance: none;
		width: 17px;
		height: 17px;
		border-radius: 999px;
		border: 1px solid var(--z-accent-edge);
		background: var(--z-surface);
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
		cursor: pointer;
	}

	.z-range::-moz-range-thumb {
		width: 17px;
		height: 17px;
		border-radius: 999px;
		border: 1px solid var(--z-accent-edge);
		background: var(--z-surface);
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
		cursor: pointer;
	}

	.z-range::-moz-range-progress {
		height: 7px;
		border-radius: 999px;
		background: var(--z-accent);
	}
</style>
