export interface ComposeAttachment {
	id: string;
	name: string;
	type: string;
	size: number;
	blobId: string | null;
	uploading: boolean;
	uploadError?: string;
}

export interface StoredComposeAttachment {
	name: string;
	type: string;
	size: number;
	blobId: string;
}

export interface OutboxAttachmentPayload {
	blobId: string;
	name: string;
	type: string;
	size: number;
}
