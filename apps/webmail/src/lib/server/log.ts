/**
 * Structured JSON logging to stdout/stderr — one line per event, so CapRover /
 * docker logs stay grep- and `jq`-able. Event names are stable snake_case
 * identifiers; free-form prose goes in fields, never in the event name.
 */

type LogFields = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', event: string, fields: LogFields, error?: unknown): void {
	const entry: LogFields = {
		time: new Date().toISOString(),
		level,
		event,
		...fields
	};
	if (error !== undefined) {
		if (error instanceof Error) {
			entry.error = error.message;
			if (error.stack) entry.stack = error.stack;
		} else {
			entry.error = String(error);
		}
	}
	const line = JSON.stringify(entry);
	if (level === 'error') {
		console.error(line);
	} else if (level === 'warn') {
		console.warn(line);
	} else {
		console.log(line);
	}
}

export const log = {
	info: (event: string, fields: LogFields = {}) => emit('info', event, fields),
	warn: (event: string, fields: LogFields = {}, error?: unknown) => emit('warn', event, fields, error),
	error: (event: string, fields: LogFields = {}, error?: unknown) => emit('error', event, fields, error)
};
