const API_KEY_DISABLED_PERMISSIONS = [
	'sysAccountPasswordUpdate',
	'sysAppPasswordCreate',
	'sysAppPasswordUpdate',
	'sysAppPasswordDestroy',
	'sysApiKeyCreate',
	'sysApiKeyUpdate',
	'sysApiKeyDestroy'
] as const;

export function credentialPermissions(type: 'AppPassword' | 'ApiKey') {
	return type === 'ApiKey'
		? { '@type': 'Disable' as const, permissions: [...API_KEY_DISABLED_PERMISSIONS] }
		: { '@type': 'Inherit' as const };
}

export function extractOneTimeCredential(
	data: Record<string, unknown>,
	creationId: string
): { id: string; secret: string } | null {
	if (!data.created || typeof data.created !== 'object') return null;
	const created = (data.created as Record<string, unknown>)[creationId];
	if (!created || typeof created !== 'object') return null;
	const record = created as Record<string, unknown>;
	return typeof record.id === 'string' && typeof record.secret === 'string'
		? { id: record.id, secret: record.secret }
		: null;
}
