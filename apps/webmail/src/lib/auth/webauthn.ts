export function base64UrlToBuffer(value: string): ArrayBuffer {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface PublicKeyCreationOptionsJson {
	rp: { name: string; id?: string };
	user: { id: string; name: string; displayName: string };
	challenge: string;
	pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
	timeout?: number;
	excludeCredentials?: Array<{ type: 'public-key'; id: string; transports?: string[] }>;
	authenticatorSelection?: AuthenticatorSelectionCriteria;
	attestation?: AttestationConveyancePreference;
	extensions?: AuthenticationExtensionsClientInputs;
}

export function toCreationOptions(
	options: PublicKeyCreationOptionsJson
): PublicKeyCredentialCreationOptions {
	return {
		rp: {
			name: options.rp.name,
			id: options.rp.id
		},
		user: {
			id: base64UrlToBuffer(options.user.id),
			name: options.user.name,
			displayName: options.user.displayName
		},
		challenge: base64UrlToBuffer(options.challenge),
		pubKeyCredParams: options.pubKeyCredParams,
		timeout: options.timeout,
		excludeCredentials: options.excludeCredentials?.map((credential) => ({
			type: credential.type,
			id: base64UrlToBuffer(credential.id),
			transports: credential.transports as AuthenticatorTransport[] | undefined
		})),
		authenticatorSelection: options.authenticatorSelection,
		attestation: options.attestation,
		extensions: options.extensions
	};
}

export function credentialToRegistrationPayload(credential: PublicKeyCredential) {
	const response = credential.response as AuthenticatorAttestationResponse;
	return {
		type: credential.type,
		id: credential.id,
		rawId: bufferToBase64Url(credential.rawId),
		response: {
			clientDataJSON: bufferToBase64Url(response.clientDataJSON),
			attestationObject: bufferToBase64Url(response.attestationObject),
			transports: response.getTransports?.() ?? undefined
		},
		authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
		clientExtensionResults: credential.getClientExtensionResults()
	};
}
