import { error } from '@sveltejs/kit';
import { query, command, getRequestEvent } from '$app/server';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import { createConnectedClient } from '#lib/server/jmap';

function schema<T>() {
	return {
		'~standard': {
			version: 1,
			vendor: 'zaur',
			validate(value: unknown) {
				return { value: value as T };
			}
		}
	} as any;
}

async function connect() {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	const account = session ? getActiveAccount(session) : undefined;
	if (!account) error(401, 'Unauthorized');
	try {
		return await createConnectedClient(account);
	} catch (cause) {
		if (cause instanceof Error && cause.message === 'Unauthorized') error(401, 'Unauthorized');
		throw cause;
	}
}

export type IdentityDTO = { id: string; email: string; name: string };

/** Send-as addresses: the primary plus any aliases Stalwart knows about. */
export const identities = query(async (): Promise<IdentityDTO[]> => {
	const client = await connect();
	const list = await client.getIdentities();
	return list.map((identity) => ({
		id: identity.id,
		email: identity.email,
		name: identity.name ?? ''
	}));
});

/** The name recipients see on mail sent from this address. */
export const setDisplayName = command(
	schema<{ identityId: string; name: string }>(),
	async ({ identityId, name }): Promise<{ ok: true }> => {
		const trimmed = String(name ?? '').trim();
		if (trimmed.length > 120) error(400, 'Display name is too long');
		const client = await connect();
		await client.setIdentityName(String(identityId), trimmed);
		return { ok: true };
	}
);
