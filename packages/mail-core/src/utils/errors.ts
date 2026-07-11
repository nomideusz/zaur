/** The `unknown` catch-variable → user-facing message pattern, once. */
export function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}
