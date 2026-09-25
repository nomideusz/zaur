import { createWriteStream, openAsBlob } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { requireAccount } from '#lib/server/account';
import { createConnectedClient } from '#lib/server/jmap';
import { reportError } from '#lib/server/report';

/**
 * Raw blob upload, for compose attachments and Files: the file bytes go
 * through as the request body, the server forwards them to Stalwart's JMAP
 * upload endpoint and returns `{ blobId, size, type }`. File transfers are not
 * remote-function state, so this is a plain endpoint — same shape as webmail
 * 1.0's /api/jmap/upload proxy.
 *
 * The body is spooled to a temporary file rather than held in memory: a file
 * in Files can be as big as Stalwart takes (`maxSizeUpload`, 50 MB by
 * default), and a file-backed Blob is read from disk as it is sent — twice,
 * should the token need refreshing. What caps a request is the image's
 * `BODY_SIZE_LIMIT` (50M, just over Stalwart's 50 MB): raise both together.
 */
export const POST: RequestHandler = async ({ request }) => {
	const account = requireAccount();
	if (!request.body) error(400, 'Empty upload');

	const type = request.headers.get('content-type') ?? 'application/octet-stream';
	const dir = await mkdtemp(join(tmpdir(), 'mail2-upload-'));
	try {
		const path = join(dir, 'body');
		await pipeline(Readable.fromWeb(request.body as NodeReadableStream), createWriteStream(path));
		const data = await openAsBlob(path, { type });
		if (!data.size) error(400, 'Empty upload');

		try {
			const client = await createConnectedClient(account);
			return json(await client.uploadBlob(data, type));
		} catch (cause) {
			if (cause instanceof Error && cause.message === 'Unauthorized') {
				error(401, 'Unauthorized');
			}
			console.error('[api/upload] Upstream upload failed:', cause);
			reportError(cause, { where: 'api/upload' });
			return json({ error: 'Upload failed' }, { status: 502 });
		}
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
};
