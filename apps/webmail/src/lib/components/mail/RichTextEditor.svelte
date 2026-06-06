<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
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

	function toggleLink() {
		if (!editor) return;
		if (editor.isActive('link')) {
			editor.chain().focus().unsetLink().run();
			return;
		}
		const url = prompt('Enter link URL:');
		if (url) {
			editor.chain().focus().setLink({ href: url }).run();
		}
	}

	onMount(() => {
		if (!element) return;
		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({ link: false }),
				Link.configure({
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
	<!-- Toolbar -->
	<div class="z-rich-editor__toolbar flex flex-wrap gap-1 border-b border-border/80 pb-2 bg-transparent">
		<button
			type="button"
			class="z-rich-editor__btn"
			class:z-rich-editor__btn--active={isBold}
			onclick={() => { editor?.chain().focus().toggleBold().run(); updateActiveStates(); }}
			title="Bold"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8h8Z"/><path d="M15 20a4 4 0 0 0 0-8H6v8h9Z"/></svg>
		</button>
		<button
			type="button"
			class="z-rich-editor__btn"
			class:z-rich-editor__btn--active={isItalic}
			onclick={() => { editor?.chain().focus().toggleItalic().run(); updateActiveStates(); }}
			title="Italic"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
		</button>
		<button
			type="button"
			class="z-rich-editor__btn"
			class:z-rich-editor__btn--active={isStrike}
			onclick={() => { editor?.chain().focus().toggleStrike().run(); updateActiveStates(); }}
			title="Strikethrough"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6A5 5 0 0 0 8 9h8a5 5 0 0 1-8 3"/></svg>
		</button>

		<div class="z-rich-editor__divider"></div>

		<button
			type="button"
			class="z-rich-editor__btn"
			class:z-rich-editor__btn--active={isBulletList}
			onclick={() => { editor?.chain().focus().toggleBulletList().run(); updateActiveStates(); }}
			title="Bullet List"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
		</button>
		<button
			type="button"
			class="z-rich-editor__btn"
			class:z-rich-editor__btn--active={isOrderedList}
			onclick={() => { editor?.chain().focus().toggleOrderedList().run(); updateActiveStates(); }}
			title="Numbered List"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1Zm0 12H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1Zm0-6H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1Z"/></svg>
		</button>
		<button
			type="button"
			class="z-rich-editor__btn"
			class:z-rich-editor__btn--active={isBlockquote}
			onclick={() => { editor?.chain().focus().toggleBlockquote().run(); updateActiveStates(); }}
			title="Blockquote"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
		</button>

		<div class="z-rich-editor__divider"></div>

		<button
			type="button"
			class="z-rich-editor__btn"
			class:z-rich-editor__btn--active={isLink}
			onclick={toggleLink}
			title="Link"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
		</button>
		<button
			type="button"
			class="z-rich-editor__btn"
			onclick={() => fileInput?.click()}
			title="Insert Image"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
		</button>
	</div>

	<!-- Editor body -->
	<div bind:this={element} class="z-rich-editor__wrapper flex-1 overflow-y-auto pt-3 bg-transparent"></div>
</div>

<style>
	.z-rich-editor {
		font-family: var(--z-reader-font, sans-serif);
		color: var(--z-fg, #000);
	}

	.z-rich-editor__toolbar {
		border-color: var(--z-border, rgba(0,0,0,0.1));
		box-shadow: none;
	}

	.z-rich-editor__btn {
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

	.z-rich-editor__btn:hover {
		background-color: var(--z-hover, rgba(0,0,0,0.05));
		color: var(--z-fg, #000);
	}

	.z-rich-editor__btn--active {
		background-color: var(--z-active, rgba(0,0,0,0.1));
		color: var(--z-accent, #0076ff);
	}

	.z-rich-editor__divider {
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
