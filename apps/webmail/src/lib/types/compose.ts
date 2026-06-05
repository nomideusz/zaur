export interface ComposeAttachment {
	id: string;
	name: string;
	type: string;
	size: number;
	blobId: string | null;
	uploading: boolean;
	uploadError?: string;
	cid?: string;
	disposition?: string;
}

export interface StoredComposeAttachment {
	name: string;
	type: string;
	size: number;
	blobId: string;
	cid?: string;
	disposition?: string;
}

export interface OutboxAttachmentPayload {
	blobId: string;
	name: string;
	type: string;
	size: number;
}

