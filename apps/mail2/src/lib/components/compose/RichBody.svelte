<!--
	The message box: Basecamp's Trix, as a web component. It is uncontrolled —
	seeded once from the draft, then it reports what was written as both HTML and
	its plain-text reading (the text/plain alternative, and what the rest of
	compose still reasons about). The toolbar is RichToolbar, found by id.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { plainTextToSafeHtml } from '@zaur/mail-core/email/text';

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
		/** Files dropped or pasted into the text: they are attachments, not inline images. */
		onfiles: (files: File[]) => void;
	}

	let { id, toolbar, html, text, class: className = '', height, onchange, onfocus, onfiles }: Props = $props();

	let el = $state<TrixElement | null>(null);
	/** What the editor holds that the draft already knows — loading is not writing. */
	let known = '';
	let loading = false;

	onMount(() => {
		void import('trix');
	});

	$effect(() => {
		const node = el;
		if (!node) return;
		const init = () => {
			const seed = html || plainTextToSafeHtml(text);
			loading = true;
			// A reply opens on an empty line above its quote, not inside it.
			node.editor.loadHTML(seed.startsWith('<blockquote') ? `<div><br></div>${seed}` : seed);
			node.editor.setSelectedRange(0);
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
			const body = node.editor.getDocument().toString().trimEnd();
			onchange(body, body ? node.value : '');
		};
		const accept = (event: Event) => {
			event.preventDefault();
			const file = (event as Event & { file?: File }).file;
			if (file) onfiles([file]);
		};
		const focus = () => onfocus?.();
		node.addEventListener('trix-initialize', init);
		node.addEventListener('trix-change', change);
		node.addEventListener('trix-file-accept', accept);
		node.addEventListener('trix-focus', focus);
		return () => {
			node.removeEventListener('trix-initialize', init);
			node.removeEventListener('trix-change', change);
			node.removeEventListener('trix-file-accept', accept);
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
></trix-editor>

<style>
	/* Trix ships its own sheet; this is the part of it mail2 needs, in mail2's tokens. */
	:global(trix-editor.z-rich) {
		display: block;
		overflow-y: auto;
		outline: none;
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
</style>
