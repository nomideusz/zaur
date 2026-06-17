<script lang="ts">
	import { FileUpload } from '@ark-ui/svelte/file-upload';
	import type { FileUploadFileRejection } from '@ark-ui/svelte/file-upload';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	export type FileUploadRejection = {
		file: File;
		errors: string[];
	};

	interface Props {
		class?: string;
		disabled?: boolean;
		onaccept: (files: File[]) => void;
		onreject?: (rejections: FileUploadRejection[]) => void;
		children: Snippet;
	}

	let { class: className, disabled = false, onaccept, onreject, children }: Props = $props();

	function mapRejections(files: FileUploadFileRejection[]): FileUploadRejection[] {
		return files.map((entry) => ({
			file: entry.file,
			errors: entry.errors as string[]
		}));
	}
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
	onFileReject={(details) => onreject?.(mapRejections(details.files))}
>
	<FileUpload.HiddenInput />
	{@render children()}
</FileUpload.Root>
