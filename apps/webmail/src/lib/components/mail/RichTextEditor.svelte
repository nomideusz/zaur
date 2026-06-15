<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ToggleGroup } from '@ark-ui/svelte/toggle-group';
	import { Popover } from '@ark-ui/svelte/popover';
	import { Portal } from '@ark-ui/svelte/portal';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import { Color, TextStyle } from '@tiptap/extension-text-style';
	import RiFontColor from 'svelte-remixicon/RiFontColor.svelte';
	import RiBold from 'svelte-remixicon/RiBold.svelte';
	import RiDoubleQuotesL from 'svelte-remixicon/RiDoubleQuotesL.svelte';
	import RiFormatClear from 'svelte-remixicon/RiFormatClear.svelte';
	import RiImageLine from 'svelte-remixicon/RiImageLine.svelte';
	import RiItalic from 'svelte-remixicon/RiItalic.svelte';
	import RiLink from 'svelte-remixicon/RiLink.svelte';
	import RiListOrdered from 'svelte-remixicon/RiListOrdered.svelte';
	import RiListUnordered from 'svelte-remixicon/RiListUnordered.svelte';
	import RiStrikethrough from 'svelte-remixicon/RiStrikethrough.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		inlineHtmlForDisplay,
		inlineHtmlForStorage,
		inlineImageDownloadUrl
	} from '$lib/email/inline-images';

	interface Props {
		htmlValue: string;
		textValue: string;
		onchange: (html: string, text: string) => void;
	}

	let { htmlValue = $bindable(), textValue = $bindable(), onchange }: Props = $props();

	let element = $state<HTMLElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let editor = $state<Editor | null>(null);

	// Reactive tracking of formatting state
	let isBold = $state(false);
	let isItalic = $state(false);
	let isStrike = $state(false);
	let isBulletList = $state(false);
	let isOrderedList = $state(false);
	let isBlockquote = $state(false);
	let isLink = $state(false);
	let activeColor = $state<string | null>(null);
	let colorMenuOpen = $state(false);

	/** Strong hues that stay legible on both light and dark surfaces. */
	const TEXT_COLORS = [
		{ label: 'Red', value: '#dc2626' },
		{ label: 'Orange', value: '#ea580c' },
		{ label: 'Green', value: '#16a34a' },
		{ label: 'Blue', value: '#2563eb' },
		{ label: 'Purple', value: '#9333ea' },
		{ label: 'Pink', value: '#db2777' },
		{ label: 'Gray', value: '#6b7280' }
	];

	function setColor(value: string | null) {
		if (!editor) return;
		if (value) editor.chain().focus().setColor(value).run();
		else editor.chain().focus().unsetColor().run();
		colorMenuOpen = false;
		updateActiveStates();
	}

	const textFormats = $derived([
		...(isBold ? ['bold'] : []),
		...(isItalic ? ['italic'] : []),
		...(isStrike ? ['strike'] : [])
	]);
	const paragraphFormat = $derived(
		isBulletList ? 'bulletList' : isOrderedList ? 'orderedList' : isBlockquote ? 'blockquote' : ''
	);

	function inlineAttachmentSources() {
		return compose.attachments
			.filter((attachment): attachment is typeof attachment & { blobId: string } => !!attachment.blobId)
			.map((attachment) => ({
				blobId: attachment.blobId,
				name: attachment.name,
				type: attachment.type,
				cid: attachment.cid,
				disposition: attachment.disposition
			}));
	}

	function editorHtml(html: string): string {
		return inlineHtmlForDisplay(html, inlineAttachmentSources());
	}

	function storedHtml(html: string): string {
		return inlineHtmlForStorage(
			html,
			inlineAttachmentSources().map((attachment) => ({
				blobId: attachment.blobId,
				cid: attachment.cid
			}))
		);
	}

	function updateActiveStates() {
		if (!editor) return;
		isBold = editor.isActive('bold');
		isItalic = editor.isActive('italic');
		isStrike = editor.isActive('strike');
		isBulletList = editor.isActive('bulletList');
		isOrderedList = editor.isActive('orderedList');
		isBlockquote = editor.isActive('blockquote');
		isLink = editor.isActive('link');
		activeColor = (editor.getAttributes('textStyle').color as string | undefined) ?? null;
	}

	async function handleUploadedFiles(files: File[]) {
		if (!auth.client) return;
		const imageFiles = files.filter((f) => f.type.startsWith('image/'));
		if (!imageFiles.length) return;

		for (const file of imageFiles) {
			const localUrl = URL.createObjectURL(file);
			editor?.chain().focus().setImage({ src: localUrl, alt: file.name }).run();

			try {
				const uploaded = await auth.client.uploadBlob(file, file.type || 'application/octet-stream');
				const blobId = uploaded.blobId;

				// Register in compose attachments as inline
				const attachmentId = crypto.randomUUID();
				compose.attachments = [
					...compose.attachments,
					{
						id: attachmentId,
						name: file.name,
						type: file.type || 'application/octet-stream',
						size: file.size,
						blobId: blobId,
						uploading: false,
						cid: blobId,
						disposition: 'inline'
					}
				];

				// Keep blob URLs out of persisted HTML; show a CSP-safe preview in the editor.
				const displayUrl = inlineImageDownloadUrl({
					blobId,
					name: file.name,
					type: file.type || 'application/octet-stream'
				});
				if (editor) {
					const { state, dispatch } = editor.view;
					state.doc.descendants((node, pos) => {
						if (node.type.name === 'image' && node.attrs.src === localUrl) {
							const transaction = state.tr.setNodeMarkup(pos, undefined, {
								...node.attrs,
								src: displayUrl
							});
							dispatch(transaction);
							return false; // Stop traversal
						}
					});
				}
			} catch (err) {
				toast.show(
					`Failed to upload inline image: ${err instanceof Error ? err.message : 'Unknown error'}`,
					'error'
				);
				// If upload fails, remove the local image block
				if (editor) {
					const { state, dispatch } = editor.view;
					state.doc.descendants((node, pos) => {
						if (node.type.name === 'image' && node.attrs.src === localUrl) {
							dispatch(state.tr.delete(pos, pos + node.nodeSize));
							return false;
						}
					});
				}
			} finally {
				URL.revokeObjectURL(localUrl);
			}
		}
	}

	function onImageSelect(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (target.files?.length) {
			void handleUploadedFiles(Array.from(target.files));
			target.value = '';
		}
	}

	function toolbarMouseDown(event: MouseEvent) {
		// Keep the editor selection when clicking toolbar buttons.
		event.preventDefault();
	}

	function setTextFormats(next: string[]) {
		if (!editor) return;
		const chain = editor.chain().focus();
		if (next.includes('bold') !== isBold) chain.toggleBold();
		if (next.includes('italic') !== isItalic) chain.toggleItalic();
		if (next.includes('strike') !== isStrike) chain.toggleStrike();
		chain.run();
		updateActiveStates();
	}

	function setParagraphFormat(next: string) {
		if (!editor) return;
		const chain = editor.chain().focus();
		if (next === 'bulletList') chain.toggleBulletList();
		else if (next === 'orderedList') chain.toggleOrderedList();
		else if (next === 'blockquote') chain.toggleBlockquote();
		else if (isBulletList) chain.toggleBulletList();
		else if (isOrderedList) chain.toggleOrderedList();
		else if (isBlockquote) chain.toggleBlockquote();
		chain.run();
		updateActiveStates();
	}

	function clearFormatting() {
		editor?.chain().focus().unsetAllMarks().clearNodes().run();
		updateActiveStates();
	}

	function toggleLink() {
		if (!editor) return;
		if (editor.isActive('link')) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			updateActiveStates();
			return;
		}
		const previousUrl = editor.getAttributes('link').href as string | undefined;
		const { from, to } = editor.state.selection;
		const url = prompt('Enter link URL:', previousUrl || 'https://');
		if (!url) return;
		editor
			.chain()
			.focus()
			.setTextSelection({ from, to })
			.extendMarkRange('link')
			.toggleLink({ href: url })
			.run();
		updateActiveStates();
	}

	onMount(() => {
		if (!element) return;
		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({ link: false }),
				TextStyle,
				Color,
				Link.extend({ keepOnSplit: true }).configure({
					openOnClick: false,
					HTMLAttributes: {
						target: '_blank',
						rel: 'noopener noreferrer'
					}
				}),
				Image
			],
			content: editorHtml(htmlValue),
			editorProps: {
				attributes: {
					class: 'z-rich-editor__editable outline-none min-h-[12rem] flex-1 text-sm leading-relaxed'
				},
				handleDrop: (view, event, slice, moved) => {
					if (!moved && event.dataTransfer?.files?.length) {
						event.preventDefault();
						void handleUploadedFiles(Array.from(event.dataTransfer.files));
						return true;
					}
					return false;
				},
				handlePaste: (view, event) => {
					if (event.clipboardData?.files?.length) {
						event.preventDefault();
						void handleUploadedFiles(Array.from(event.clipboardData.files));
						return true;
					}
					return false;
				}
			},
			onUpdate: ({ editor }) => {
				const html = storedHtml(editor.getHTML());
				htmlValue = html;
				textValue = editor.getText();
				onchange?.(html, textValue);
				updateActiveStates();
			},
			onSelectionUpdate: () => {
				updateActiveStates();
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});
</script>

<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	class="hidden"
	onchange={onImageSelect}
/>

<div class="z-rich-editor flex flex-col min-h-0 flex-1 bg-transparent">
	<!-- Ark has no Toolbar/Separator: native role="toolbar"/"separator" wrappers, with
	     ToggleGroup (built-in roving + data-state='on') for the toggle button groups. -->
	<div
		class="z-rich-editor__toolbar"
		role="toolbar"
		tabindex={-1}
		aria-label="Rich text formatting"
		aria-orientation="horizontal"
		onmousedown={toolbarMouseDown}
	>
		<ToggleGroup.Root
			multiple
			value={textFormats}
			onValueChange={(details) => setTextFormats(details.value)}
			class="z-rich-editor__group"
			aria-label="Text style"
		>
			<TooltipWrap label="Bold">
				{#snippet trigger({ props })}
					<ToggleGroup.Item value="bold" class="z-rich-editor__btn" aria-label="Bold" {...props}>
						<RiBold size="18" />
					</ToggleGroup.Item>
				{/snippet}
			</TooltipWrap>
			<TooltipWrap label="Italic">
				{#snippet trigger({ props })}
					<ToggleGroup.Item value="italic" class="z-rich-editor__btn" aria-label="Italic" {...props}>
						<RiItalic size="18" />
					</ToggleGroup.Item>
				{/snippet}
			</TooltipWrap>
			<TooltipWrap label="Strikethrough">
				{#snippet trigger({ props })}
					<ToggleGroup.Item value="strike" class="z-rich-editor__btn" aria-label="Strikethrough" {...props}>
						<RiStrikethrough size="18" />
					</ToggleGroup.Item>
				{/snippet}
			</TooltipWrap>
		</ToggleGroup.Root>

		<div class="z-rich-editor__divider" role="separator" aria-orientation="vertical"></div>

		<ToggleGroup.Root
			value={paragraphFormat ? [paragraphFormat] : []}
			onValueChange={(details) => setParagraphFormat(details.value[0] ?? '')}
			class="z-rich-editor__group"
			aria-label="Paragraph style"
		>
			<TooltipWrap label="Bullet list">
				{#snippet trigger({ props })}
					<ToggleGroup.Item value="bulletList" class="z-rich-editor__btn" aria-label="Bullet list" {...props}>
						<RiListUnordered size="18" />
					</ToggleGroup.Item>
				{/snippet}
			</TooltipWrap>
			<TooltipWrap label="Numbered list">
				{#snippet trigger({ props })}
					<ToggleGroup.Item value="orderedList" class="z-rich-editor__btn" aria-label="Numbered list" {...props}>
						<RiListOrdered size="18" />
					</ToggleGroup.Item>
				{/snippet}
			</TooltipWrap>
			<TooltipWrap label="Quote">
				{#snippet trigger({ props })}
					<ToggleGroup.Item value="blockquote" class="z-rich-editor__btn" aria-label="Quote" {...props}>
						<RiDoubleQuotesL size="18" />
					</ToggleGroup.Item>
				{/snippet}
			</TooltipWrap>
		</ToggleGroup.Root>

		<div class="z-rich-editor__divider" role="separator" aria-orientation="vertical"></div>

		<TooltipWrap label="Link">
			{#snippet trigger({ props })}
				<button
					type="button"
					class={isLink ? 'z-rich-editor__btn z-rich-editor__btn--active' : 'z-rich-editor__btn'}
					onclick={toggleLink}
					aria-label="Link"
					{...props}
				>
					<RiLink size="18" />
				</button>
			{/snippet}
		</TooltipWrap>
		<TooltipWrap label="Insert image">
			{#snippet trigger({ props })}
				<button
					type="button"
					class="z-rich-editor__btn"
					onclick={() => fileInput?.click()}
					aria-label="Insert image"
					{...props}
				>
					<RiImageLine size="18" />
				</button>
			{/snippet}
		</TooltipWrap>
		<Popover.Root
			open={colorMenuOpen}
			onOpenChange={(details) => (colorMenuOpen = details.open)}
			positioning={{ placement: 'bottom-start', gutter: 6 }}
		>
			<TooltipWrap label="Text color">
				{#snippet trigger({ props })}
					<Popover.Trigger
						class={activeColor ? 'z-rich-editor__btn z-rich-editor__btn--active' : 'z-rich-editor__btn'}
						aria-label="Text color"
						style={activeColor ? `color: ${activeColor}` : ''}
						{...props}
					>
						<RiFontColor size="18" />
					</Popover.Trigger>
				{/snippet}
			</TooltipWrap>
			<Portal>
				<Popover.Positioner>
					<Popover.Content class="z-rich-editor__palette">
						<button
							type="button"
							class="z-rich-editor__swatch z-rich-editor__swatch--default"
							class:z-rich-editor__swatch--current={!activeColor}
							aria-label="Default color"
							onclick={() => setColor(null)}
						>
							A
						</button>
						{#each TEXT_COLORS as color (color.value)}
							<button
								type="button"
								class="z-rich-editor__swatch"
								class:z-rich-editor__swatch--current={activeColor?.toLowerCase() === color.value}
								style={`background: ${color.value}`}
								aria-label={color.label}
								onclick={() => setColor(color.value)}
							></button>
						{/each}
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
		<TooltipWrap label="Clear formatting">
			{#snippet trigger({ props })}
				<button
					type="button"
					class="z-rich-editor__btn"
					onclick={clearFormatting}
					aria-label="Clear formatting"
					{...props}
				>
					<RiFormatClear size="18" />
				</button>
			{/snippet}
		</TooltipWrap>
	</div>

	<!-- Editor body -->
	<div bind:this={element} class="z-rich-editor__wrapper flex-1 overflow-y-auto pt-3 bg-transparent"></div>
</div>

<style>
	.z-rich-editor {
		font-family: var(--z-reader-font, sans-serif);
		color: var(--z-fg, #000);
	}

	/* Bleed past the compose pane's 1rem inline padding so the bottom rule
	   spans the full pane width. */
	:global(.z-rich-editor__toolbar) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		margin-inline: -1rem;
		padding-inline: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--z-border, rgba(0,0,0,0.1));
		border-color: var(--z-border, rgba(0,0,0,0.1));
		box-shadow: none;
	}

	:global(.z-rich-editor__palette) {
		z-index: 60;
		display: grid;
		grid-template-columns: repeat(4, 1.5rem);
		gap: 0.375rem;
		padding: 0.5rem;
		border: 1px solid var(--z-border, rgba(0, 0, 0, 0.1));
		border-radius: 0.5rem;
		background: var(--z-surface-raised, #fff);
		box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
	}

	:global(.z-rich-editor__swatch) {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.375rem;
		border: 1px solid var(--z-border, rgba(0, 0, 0, 0.1));
		cursor: pointer;
		transition: transform var(--z-motion-fast, 150ms) var(--z-ease-standard, ease);
	}

	:global(.z-rich-editor__swatch:hover) {
		transform: scale(1.12);
	}

	:global(.z-rich-editor__swatch--current) {
		outline: 2px solid var(--z-accent, #0076ff);
		outline-offset: 1px;
	}

	:global(.z-rich-editor__swatch--default) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		color: var(--z-fg, #000);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	:global(.z-rich-editor__group) {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
	}

	:global(.z-rich-editor__btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 4px;
		border-radius: 4px;
		border: none;
		background: transparent;
		color: var(--z-fg-muted, #555);
		cursor: pointer;
		transition: background-color var(--z-motion-fast, 150ms) var(--z-ease-standard, ease), color var(--z-motion-fast, 150ms) var(--z-ease-standard, ease);
	}

	:global(.z-rich-editor__btn:hover) {
		background-color: var(--z-hover, rgba(0,0,0,0.05));
		color: var(--z-fg, #000);
	}

	:global(.z-rich-editor__btn[data-state='on']),
	:global(.z-rich-editor__btn--active) {
		background-color: var(--z-active, rgba(0,0,0,0.1));
		color: var(--z-accent, #0076ff);
	}

	:global(.z-rich-editor__divider) {
		width: 1px;
		height: 18px;
		background-color: var(--z-border, rgba(0,0,0,0.1));
		margin: 5px 4px;
	}

	:global(.z-rich-editor__editable) {
		min-height: 12rem;
		height: 100%;
		font-family: var(--z-reader-font, sans-serif);
		font-size: var(--z-reader-text, 0.9375rem);
		color: var(--z-fg, #000);
	}

	:global(.z-rich-editor__editable p) {
		margin-bottom: 0.75rem;
	}

	:global(.z-rich-editor__editable ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin-bottom: 0.75rem;
	}

	:global(.z-rich-editor__editable ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin-bottom: 0.75rem;
	}

	:global(.z-rich-editor__editable blockquote) {
		border-left: 3px solid var(--z-accent, #0076ff);
		background-color: var(--z-surface-card, rgba(0,0,0,0.02));
		padding: 0.5rem 0.75rem;
		margin-left: 0;
		margin-right: 0;
		margin-bottom: 0.75rem;
		border-radius: 0 4px 4px 0;
		color: var(--z-fg-muted, #555);
	}

	:global(.z-rich-editor__editable a) {
		color: var(--z-accent, #0076ff);
		text-decoration: underline;
	}

	:global(.z-rich-editor__editable img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
		margin: 0.75rem 0;
		border: 1px solid var(--z-border, rgba(0,0,0,0.1));
	}
</style>
