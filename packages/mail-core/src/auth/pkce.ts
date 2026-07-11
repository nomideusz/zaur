// PKCE S256 helpers with injected crypto (Node webcrypto, browser, expo-crypto).
// No imports so the module is directly runnable under `node --test`.
export interface PkceCrypto {
	randomBytes(length: number): Uint8Array;
	sha256(data: Uint8Array): Promise<Uint8Array>;
}

export function base64UrlEncode(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	// Node fallback via globalThis so the package typechecks without node types.
	const BufferCtor = (
		globalThis as { Buffer?: { from(data: Uint8Array): { toString(encoding: string): string } } }
	).Buffer;
	const base64 =
		typeof btoa === 'function' ? btoa(binary) : BufferCtor!.from(bytes).toString('base64');
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function computePkceChallenge(verifier: string, crypto: PkceCrypto): Promise<string> {
	return base64UrlEncode(await crypto.sha256(new TextEncoder().encode(verifier)));
}

export async function createPkcePair(
	crypto: PkceCrypto
): Promise<{ verifier: string; challenge: string }> {
	const verifier = base64UrlEncode(crypto.randomBytes(48));
	return { verifier, challenge: await computePkceChallenge(verifier, crypto) };
}
