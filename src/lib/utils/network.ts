export function isOfflineError(error: unknown): boolean {
	if (typeof navigator !== 'undefined' && !navigator.onLine) return true;

	if (error instanceof TypeError) return true;

	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes('failed to fetch') ||
			message.includes('network') ||
			message.includes('load failed') ||
			message.includes('networkerror')
		);
	}

	return false;
}

export function isStateTooOldError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	return message.includes('cannotcalculatechanges') || message.includes('state is too old');
}
