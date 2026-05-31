/** Stable hash → per-message rainbow hue and gradient phase. */
function hashMessageId(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
	}
	return hash >>> 0;
}

/** Inline CSS vars for important subject rainbow (light/dark handled in CSS). */
export function importantRainbowStyle(messageId: string): string {
	const hash = hashMessageId(messageId);
	const hue = hash % 360;
	const phase = 5 + (hash % 61);
	return `--important-hue: ${hue}deg; --important-phase: ${phase}%`;
}
