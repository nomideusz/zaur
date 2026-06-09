<script lang="ts">
	import ImportantSubjectHighlight from '$lib/components/mail/ImportantSubjectHighlight.svelte';
	import { importantMarker } from '$lib/mail/important-marker.svelte';
	import { createImportantMarkerTouchPick } from '$lib/mail/important-marker-touch';
	import { cn } from '$lib/utils/cn';

	let {
		messageId,
		subjectText,
		unread,
		important,
		mobilePick,
		subjectClass,
		onOpen,
		onPickCommitted
	}: {
		messageId: string;
		subjectText: string;
		unread: boolean;
		important: boolean;
		/** Mobile list: subject outside row link — hold to preview, chip tap to cycle. */
		mobilePick: boolean;
		subjectClass: string;
		onOpen: () => void;
		onPickCommitted?: () => void;
	} = $props();

	const markerTouch = createImportantMarkerTouchPick({
		canPick: () => mobilePick
	});

	const swatchColor = $derived(importantMarker.markerColor(messageId));

	function handleSubjectClick(event: MouseEvent) {
		if (markerTouch.consumeSuppressedClick()) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		onOpen();
	}

	function cycleColor(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		importantMarker.cyclePhase(messageId);
		onPickCommitted?.();
	}
</script>

{#if important}
	{#if mobilePick}
		<div class="z-important-list-subject flex min-w-0 items-start gap-2">
			<button
				type="button"
				class={cn(subjectClass, 'z-important-subject-touch min-w-0 flex-1 text-left')}
				aria-label={`Open “${subjectText}”. Hold to change highlight color.`}
				onclick={handleSubjectClick}
				onpointerdown={(event) => {
					event.stopPropagation();
					markerTouch.onPointerDown(messageId, event);
				}}
				onpointermove={markerTouch.onPointerMove}
				onpointerup={(event) => {
					if (markerTouch.onPointerUp(messageId, event)) onPickCommitted?.();
				}}
				onpointercancel={markerTouch.onPointerCancel}
			>
				{#key importantMarker.highlightInstanceKey(messageId)}
					<ImportantSubjectHighlight
						messageId={messageId}
						instanceKey={importantMarker.highlightInstanceKey(messageId)}
						surface="list"
					>
						{subjectText}
					</ImportantSubjectHighlight>
				{/key}
			</button>
			<button
				type="button"
				class="z-important-color-chip shrink-0"
				aria-label="Change highlight color"
				onclick={cycleColor}
			>
				<span
					class="z-important-color-chip__swatch"
					style:background-color={swatchColor}
					aria-hidden="true"
				></span>
			</button>
		</div>
	{:else}
		<p class={subjectClass}>
			{#key importantMarker.highlightInstanceKey(messageId)}
				<ImportantSubjectHighlight
					messageId={messageId}
					instanceKey={importantMarker.highlightInstanceKey(messageId)}
					surface="list"
				>
					{subjectText}
				</ImportantSubjectHighlight>
			{/key}
		</p>
	{/if}
{:else}
	<p class={subjectClass}>
		{subjectText}
	</p>
{/if}
