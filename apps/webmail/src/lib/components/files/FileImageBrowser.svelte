<script lang="ts">
	import { Carousel } from '@ark-ui/svelte/carousel';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import { fileInlineImageUrl, imageNearPage } from '$lib/files/image';
	import type { FileNode } from '$lib/types/files';

	let {
		images,
		currentId,
		onSelect
	}: {
		images: FileNode[];
		currentId: string;
		onSelect: (id: string) => void;
	} = $props();

	const page = $derived(Math.max(0, images.findIndex((image) => image.id === currentId)));
	const multiple = $derived(images.length > 1);
	const showDots = $derived(images.length > 1 && images.length <= 12);

	function onPageChange(details: { page: number }) {
		const next = images[details.page];
		if (next && next.id !== currentId) onSelect(next.id);
	}
</script>

{#if images.length}
	<Carousel.Root
		class="z-file-carousel"
		slideCount={images.length}
		{page}
		loop={multiple}
		allowMouseDrag={multiple}
		{onPageChange}
	>
		<Carousel.Control class="z-file-carousel__stage">
			<Carousel.ItemGroup class="z-file-carousel__items">
				{#each images as image, index (image.id)}
					<Carousel.Item class="z-file-carousel__item" {index}>
						{#if imageNearPage(index, page, images.length)}
							{@const src = fileInlineImageUrl(image)}
							{#if src}
								<img
									src={src}
									alt={image.name}
									class="z-file-carousel__image"
									draggable="false"
								/>
							{:else}
								<p class="text-sm text-fg-muted">This image can't be displayed.</p>
							{/if}
						{:else}
							<div class="size-full" aria-hidden="true"></div>
						{/if}
					</Carousel.Item>
				{/each}
			</Carousel.ItemGroup>
			{#if multiple}
				<Carousel.PrevTrigger
					class="z-file-carousel__nav z-file-carousel__nav--prev"
					aria-label="Previous image"
				>
					<ChevronLeft class="size-5" aria-hidden="true" />
				</Carousel.PrevTrigger>
				<Carousel.NextTrigger
					class="z-file-carousel__nav z-file-carousel__nav--next"
					aria-label="Next image"
				>
					<ChevronRight class="size-5" aria-hidden="true" />
				</Carousel.NextTrigger>
			{/if}
		</Carousel.Control>
		{#if multiple}
			<div class="z-file-carousel__footer">
				<Carousel.ProgressText class="text-xs tabular-nums text-fg-muted" />
				{#if showDots}
					<Carousel.IndicatorGroup class="z-file-carousel__dots">
						{#each images as image, index (image.id)}
							<Carousel.Indicator
								class="z-file-carousel__dot"
								{index}
								aria-label="Show {image.name}"
							/>
						{/each}
					</Carousel.IndicatorGroup>
				{/if}
			</div>
		{/if}
	</Carousel.Root>
{/if}
