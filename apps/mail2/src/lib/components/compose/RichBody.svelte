<!--
	The message box: Basecamp's Trix, as a web component. It is uncontrolled —
	seeded once from the draft, then it reports what was written as both HTML and
	its plain-text reading (the text/plain alternative, and what the rest of
	compose still reasons about). The toolbar is RichToolbar, found by id.

	Images pasted or dropped into it stay in the text: Trix previews them while
	`onimage` uploads them, then points them at the uploaded blob, and the server
	sends them as inline parts (`#lib/server/inline-images.ts`). Other files go
	to the attachment strip.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { plainTextToSafeHtml } from '@zaur/mail-core/email/text';

	interface TrixAttachment {
		file?: File;
		setUploadProgress(percent: number): void;
		setAttributes(attributes: { url: string }): void;
		remove(): void;
	}

	interface TrixElement extends HTMLElement {
		value: string;
		editor: {
			loadHTML(html: string): void;
			setSelectedRange(range: number): void;
			getDocument(): { toString(): string };
		};
	}

	interface Props {
		id: string;
		/** Id of the <trix-toolbar> that drives this editor. */
		toolbar: string;
		html: string;
		/** Seeds the editor when there is no HTML yet: a reply's quote, an old plain draft. */
		text: string;
		class?: string;
		height?: string;
		onchange: (body: string, bodyHtml: string) => void;
		onfocus?: () => void;
		/** Files dropped or pasted into the text that are not images: they are attachments. */
		onfiles: (files: File[]) => void;
		/** Uploads an image written into the text; resolves to the URL it is shown from. */
		onimage: (file: File) => Promise<string>;
	}

	let { id, toolbar, html, text, class: className = '', height, onchange, onfocus, onfiles, onimage }: Props =
		$props();

	let el = $state<TrixElement | null>(null);
	/** What the editor holds that the draft already knows — loading is not writing. */
	let known = '';
	let loading = false;

	onMount(() => {
		// Trix defines its elements a tick after it loads, so this lands before any editor draws.
		void import('trix').then(({ default: Trix }) => {
			// The name and size under an image are editor furniture, not part of the letter.
			Trix.config.attachments.preview.caption = { name: false, size: false };
		});
	});

	$effect(() => {
		const node = el;
		if (!node) return;
		const init = () => {
			const seed = html || plainTextToSafeHtml(text);
			loading = true;
			// A reply opens on an empty line above its quote, not inside it.
			node.editor.loadHTML(seed.startsWith('<blockquote') ? `<div><br></div>${seed}` : seed);
			// Placing the caret focuses the editor. Trix loads lazily, so on the first panel
			// this runs after the panel focused To or Subject: hand that focus back.
			const focused = document.activeElement;
			node.editor.setSelectedRange(0);
			if (focused instanceof HTMLElement && focused !== document.body && !node.contains(focused)) focused.focus();
			loading = false;
			known = node.value;
		};
		const change = () => {
			if (loading || node.value === known) return;
			// While the link dialog is up Trix paints the held selection into the document
			// itself (a highlight span). It is gone on close, which reports again.
			if (node.value.includes('background-color: highlight')) return;
			known = node.value;
			// ponytail: the text part is Trix's reading — quotes lose their "> ". Write a
			// real html→text pass if a plain-text-only recipient ever complains.
			// An image reads as U+FFFC; in the text part it is "[image]", as Gmail writes it.
			const body = node.editor.getDocument().toString().replaceAll('\uFFFC', '[image]').trimEnd();
			onchange(body, body ? node.value : '');
		};
		const accept = (event: Event) => {
			const file = (event as Event & { file?: File }).file;
			if (file?.type.startsWith('image/')) return;
			event.preventDefault();
			if (file) onfiles([file]);
		};
		// Trix's own progress bar has nothing finer to show than started and done.
		const upload = (event: Event) => {
			const { attachment } = event as Event & { attachment: TrixAttachment };
			if (!attachment.file) return; // one loaded with the draft, already uploaded
			attachment.setUploadProgress(15);
			onimage(attachment.file).then(
				(url) => {
					attachment.setUploadProgress(100);
					attachment.setAttributes({ url });
				},
				() => attachment.remove()
			);
		};
		const focus = () => onfocus?.();
		// Once Trix is loaded (a second panel, a switch back from plain) the element
		// initializes as it connects — before this effect can listen for it. Untracked:
		// otherwise every keystroke's `html` re-seeds the editor, caret at 0 ("olleh").
		if (node.editor) untrack(init);
		else node.addEventListener('trix-initialize', init);
		node.addEventListener('trix-change', change);
		node.addEventListener('trix-file-accept', accept);
		node.addEventListener('trix-attachment-add', upload);
		node.addEventListener('trix-focus', focus);
		return () => {
			node.removeEventListener('trix-initialize', init);
			node.removeEventListener('trix-change', change);
			node.removeEventListener('trix-file-accept', accept);
			node.removeEventListener('trix-attachment-add', upload);
			node.removeEventListener('trix-focus', focus);
		};
	});
</script>

<trix-editor
	bind:this={el}
	{id}
	{toolbar}
	class="z-rich {className}"
	style:height
	style:transition="height 200ms ease"
	aria-label="Message"
	autocapitalize="sentences"
	enterkeyhint="enter"
></trix-editor>

<style>
	/* Trix ships its own sheet; this is the part of it mail2 needs, in mail2's tokens. */
	:global(trix-editor.z-rich) {
		display: block;
		overflow-y: auto;
		outline: none;
		/* The box reaches the pane's edge so its scrollbar sits there; the measure is on the blocks. */
		scrollbar-width: thin;
		scrollbar-color: var(--z-line) transparent;
	}
	:global(trix-editor.z-rich > div) {
		margin: 0;
	}
	:global(trix-editor.z-rich :is(ul, ol)) {
		margin: 0;
		padding-left: 1.4em;
	}
	:global(trix-editor.z-rich ul) {
		list-style: disc;
	}
	:global(trix-editor.z-rich ol) {
		list-style: decimal;
	}
	:global(trix-editor.z-rich blockquote) {
		margin: 0.4em 0;
		border-left: 2px solid var(--z-line);
		padding-left: 0.8em;
		color: var(--z-soft);
	}
	:global(trix-editor.z-rich a) {
		color: var(--z-accent);
		text-decoration: underline;
	}

	/* Images in the text: trix.css's attachment rules, cut to what a preview needs. */
	:global(trix-editor.z-rich .attachment) {
		display: inline-block;
		position: relative;
		max-width: 100%;
		margin: 0.3em 0;
		cursor: default;
	}
	/* An image takes its own line, as it will in the sent mail. */
	:global(trix-editor.z-rich .attachment--preview) {
		width: 100%;
	}
	:global(trix-editor.z-rich .attachment img) {
		display: block;
		max-width: 100%;
		height: auto;
		border-radius: 6px;
	}
	:global(trix-editor.z-rich [data-trix-mutable]:not(.attachment__caption-editor)) {
		user-select: none;
	}
	:global(trix-editor.z-rich [data-trix-mutable] ::selection),
	:global(trix-editor.z-rich [data-trix-mutable]::selection),
	:global(trix-editor.z-rich [data-trix-cursor-target]::selection) {
		background: none;
	}
	:global(trix-editor.z-rich [data-trix-mutable].attachment img) {
		box-shadow: 0 0 0 2px var(--z-accent);
	}
	:global(trix-editor.z-rich .attachment-gallery) {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5em;
	}
	:global(trix-editor.z-rich .attachment-gallery .attachment) {
		flex: 1 0 30%;
		max-width: 32%;
	}
	:global(trix-editor.z-rich .attachment-gallery:is(.attachment-gallery--2, .attachment-gallery--4) .attachment) {
		flex-basis: 45%;
		max-width: 49%;
	}
	:global(trix-editor.z-rich .attachment__progress) {
		position: absolute;
		z-index: 1;
		top: calc(50% - 3px);
		left: 10%;
		width: 80%;
		height: 6px;
		accent-color: var(--z-accent);
		transition: opacity 200ms ease-in;
	}
	:global(trix-editor.z-rich .attachment__progress[value='100']) {
		opacity: 0;
	}
	:global(trix-editor.z-rich .attachment__caption) {
		margin-top: 0.25em;
		color: var(--z-soft);
		font-size: 0.9em;
		line-height: 1.3;
	}
	:global(trix-editor.z-rich .attachment__caption-editor) {
		width: 100%;
		margin: 0;
		padding: 0;
		border: none;
		outline: none;
		background: transparent;
		color: inherit;
		font: inherit;
		appearance: none;
	}
	/* The remove button Trix puts on a selected image. */
	:global(trix-editor.z-rich .attachment__toolbar) {
		position: absolute;
		z-index: 1;
		top: 6px;
		right: 6px;
	}
	:global(trix-editor.z-rich .trix-button--remove) {
		position: relative;
		display: block;
		width: 26px;
		height: 26px;
		padding: 0;
		border: 1px solid var(--z-line);
		border-radius: 50%;
		background: var(--z-surface);
		box-shadow: var(--z-shadow-tactile);
		text-indent: -9999px;
		overflow: hidden;
		cursor: pointer;
	}
	:global(trix-editor.z-rich .trix-button--remove::before) {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--z-ink);
		mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18 6 6 18M6 6l12 12' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")
			center / 14px no-repeat;
	}
	:global(trix-editor.z-rich .attachment__metadata-container) {
		display: none;
	}
</style>
