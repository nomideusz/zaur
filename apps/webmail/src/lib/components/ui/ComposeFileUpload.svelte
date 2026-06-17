<script lang="ts">
	import { FileUpload } from '@ark-ui/svelte/file-upload';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		disabled?: boolean;
		onaccept: (files: File[]) => void;
		onreject?: (files: File[]) => void;
		children: Snippet;
	}

	let { class: className, disabled = false, onaccept, onreject, children }: Props = $props();
</script>

<!--
	Compose attachment picking: hidden input + dropzone drag state (data-dragging).
	Accepted files are handed off immediately — compose store owns attachment rows.
-->
<FileUpload.Root
	class={cn('z-compose-file-upload flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden', className)}
	{disabled}
	maxFiles={100}
	allowDrop
	preventDocumentDrop
	onFileAccept={(details) => onaccept(details.files)}
	onFileReject={(details) => onreject?.(details.files.map((entry) => entry.file))}
>
	<FileUpload.HiddenInput />
	{@render children()}
</FileUpload.Root>
