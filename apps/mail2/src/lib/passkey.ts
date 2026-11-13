/**
 * The browser half of a passkey ceremony, for pages served on the mail
 * server's own origin (the relying party). The server half is Stalwart's:
 * sign-in options and the assertion go through `login.remote.ts`, creation
 * options and the attestation through `security.remote.ts`. Every binary
 * field crosses as base64url, the JSON form WebAuthn defines.
 */

export interface SignInOptions {
	challenge: string;
	rpId: string;
	timeout: number;
}

export function passkeysSupported(): boolean {
	return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential && navigator.credentials?.get);
}

/** Whether the browser can offer passkeys in the address field's autofill. */
export async function autofillSupported(): Promise<boolean> {
	if (!passkeysSupported()) return false;
	try {
		return (await PublicKeyCredential.isConditionalMediationAvailable?.()) === true;
	} catch {
		return false;
	}
}

export function toBase64url(buffer: ArrayBuffer | ArrayBufferView): string {
	const bytes =
		buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(text: string): Uint8Array<ArrayBuffer> {
	const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/** What the assertion's JSON form carries (and Stalwart reads). */
export interface AssertionJSON {
	id: string;
	rawId: string;
	type: string;
	response: { clientDataJSON: string; authenticatorData: string; signature: string; userHandle: string | null };
}

/**
 * Ask for a passkey: `conditional` waits in the address field's autofill
 * until one is picked, otherwise the browser shows its own prompt. Rejects
 * with a DOMException named NotAllowedError when the person cancels (and
 * AbortError when `signal` ends the wait).
 */
export async function getAssertion(
	options: SignInOptions,
	{ mediation, signal }: { mediation?: CredentialMediationRequirement; signal?: AbortSignal } = {}
): Promise<AssertionJSON> {
	const credential = await navigator.credentials.get({
		publicKey: {
			challenge: fromBase64url(options.challenge),
			rpId: options.rpId,
			timeout: options.timeout,
			// Stalwart refuses an assertion without user verification.
			userVerification: 'required',
			allowCredentials: []
		},
		...(mediation ? { mediation } : {}),
		...(signal ? { signal } : {})
	});
	if (!(credential instanceof PublicKeyCredential)) throw new Error('No passkey was returned');
	const response = credential.response as AuthenticatorAssertionResponse;
	return {
		id: credential.id,
		rawId: toBase64url(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: toBase64url(response.clientDataJSON),
			authenticatorData: toBase64url(response.authenticatorData),
			signature: toBase64url(response.signature),
			userHandle: response.userHandle ? toBase64url(response.userHandle) : null
		}
	};
}

/** Stalwart's creation options (JSON form) as the browser takes them. */
function creationOptions(json: Record<string, unknown>): PublicKeyCredentialCreationOptions {
	const parse = (
		PublicKeyCredential as unknown as {
			parseCreationOptionsFromJSON?: (json: unknown) => PublicKeyCredentialCreationOptions;
		}
	).parseCreationOptionsFromJSON;
	if (typeof parse === 'function') return parse(json);
	const options = json as unknown as Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'> & {
		challenge: string;
		user: { id: string; name: string; displayName: string };
		excludeCredentials?: { type: 'public-key'; id: string }[];
	};
	return {
		...options,
		challenge: fromBase64url(options.challenge),
		user: { ...options.user, id: fromBase64url(options.user.id) },
		excludeCredentials: (options.excludeCredentials ?? []).map((item) => ({ type: item.type, id: fromBase64url(item.id) }))
	};
}

/**
 * Make a passkey on this device (or a security key). The result is what
 * Stalwart stores: the attestation, verified and kept on the server.
 */
export async function createPasskey(
	options: Record<string, unknown>
): Promise<{ clientDataJson: string; attestationObject: string }> {
	const credential = await navigator.credentials.create({ publicKey: creationOptions(options) });
	if (!(credential instanceof PublicKeyCredential)) throw new Error('No passkey was returned');
	const response = credential.response as AuthenticatorAttestationResponse;
	return {
		clientDataJson: toBase64url(response.clientDataJSON),
		attestationObject: toBase64url(response.attestationObject)
	};
}

/**
 * Tell the passkey provider that one it offered is gone from the server, so
 * it stops offering it (Chrome 132+; elsewhere a no-op).
 */
export function forgetUnknownPasskey(rpId: string, credentialId: string): void {
	const signal = (
		PublicKeyCredential as unknown as {
			signalUnknownCredential?: (options: { rpId: string; credentialId: string }) => Promise<void>;
		}
	).signalUnknownCredential;
	signal?.({ rpId, credentialId }).catch(() => {});
}

/** The person closed the prompt, or the wait was called off: nothing to report. */
export function wasDismissed(cause: unknown): boolean {
	return cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'AbortError');
}

/** A starting name for a new passkey: the browser and system it was made on. */
export function deviceName(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
	const browser = /Edg\//.test(userAgent)
		? 'Edge'
		: /Firefox\//.test(userAgent)
			? 'Firefox'
			: /Chrome\//.test(userAgent)
				? 'Chrome'
				: /Safari\//.test(userAgent)
					? 'Safari'
					: '';
	const system = /iPhone|iPad/.test(userAgent)
		? 'iOS'
		: /Android/.test(userAgent)
			? 'Android'
			: /Mac OS X/.test(userAgent)
				? 'macOS'
				: /Windows/.test(userAgent)
					? 'Windows'
					: /Linux/.test(userAgent)
						? 'Linux'
						: '';
	return browser && system ? `${browser} on ${system}` : browser || system || 'Passkey';
}
