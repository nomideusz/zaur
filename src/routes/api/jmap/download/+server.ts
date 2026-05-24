import { error, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { readSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}

	const blobId = url.searchParams.get('blobId');
	const name = url.searchParams.get('name');
	const type = url.searchParams.get('type') ?? 'application/octet-stream';

	if (!blobId || !name) {
		error(400, 'blobId and name are required');
	}

	try {
		const client = await createConnectedClient(session);
		const response = await client.downloadBlob(blobId, name, type);

		if (!response.ok) {
			error(response.status, 'Download failed');
		}

		const headers = new Headers();
		const contentType = response.headers.get('Content-Type');
		if (contentType) headers.set('Content-Type', contentType);
		headers.set('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);

		return new Response(response.body, { headers });
	} catch {
		error(502, 'Download failed');
	}
};
