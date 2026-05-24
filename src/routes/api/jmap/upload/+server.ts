import { json, error, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { readSession } from '$lib/server/session';

export const config = {
	bodySizeLimit: 25 * 1024 * 1024
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}

	const type = request.headers.get('content-type') ?? 'application/octet-stream';
	const data = await request.arrayBuffer();

	if (!data.byteLength) {
		error(400, 'Empty upload');
	}

	try {
		const client = await createConnectedClient(session);
		const result = await client.uploadBlob(data, type);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Upload failed';
		return json({ error: message }, { status: 502 });
	}
};
