// Server tracing to self-hosted Traceway over OTLP/HTTP. SvelteKit emits the spans
// (`tracing.server`); this exports them, reshaped for Traceway's endpoint model.
// Same DSN as error reporting, {token}@{url}/api/report. Unset = no tracing.
// Webmail 1.0 carries the same module; it is frozen, so the two are not shared.
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
	BatchSpanProcessor,
	NodeTracerProvider,
	type SpanProcessor
} from '@opentelemetry/sdk-trace-node';

const stripQuery = (value: string) => value.replace(/[?#].*/, '');

/**
 * Kit's spans, before export:
 * - Only the request root (`sveltekit.handle.root`) is an endpoint. Children lose
 *   their `http.*` attributes, or one exported in a different batch than its root
 *   would show up as an endpoint of its own.
 * - The root gets the status code (Kit records it on `sveltekit.resolve`), a
 *   `url.path`, and a route for remote calls, which have no route id.
 * - No query string leaves: search payloads, attachment names, OAuth codes.
 */
export function shapeSpans(): SpanProcessor {
	const statuses = new Map<string, unknown>();
	return {
		onStart() {},
		onEnd(span) {
			// ponytail: edits the ended span's attributes in place; the SDK allows it but
			// does not promise it. Move this into an exporter wrapper if an upgrade breaks it.
			const a = span.attributes as Record<string, unknown>;
			const traceId = span.spanContext().traceId;
			if (span.name === 'sveltekit.resolve') statuses.set(traceId, a['http.response.status_code']);
			for (const key of Object.keys(a)) {
				if (key.endsWith('.location') && typeof a[key] === 'string') a[key] = stripQuery(a[key]);
			}
			if (span.name !== 'sveltekit.handle.root') {
				for (const key of Object.keys(a)) if (key.startsWith('http.')) delete a[key];
				return;
			}
			const url = new URL(String(a['http.url']));
			a['http.url'] = url.origin + url.pathname;
			a['url.path'] = url.pathname;
			if (a['http.route'] === 'unknown') {
				// A remote call's path is stable per function; anything else unmatched
				// falls back to url.path, which Traceway folds into UNMATCHED on a 404.
				if (url.pathname.startsWith('/_app/remote/')) a['http.route'] = url.pathname;
				else delete a['http.route'];
			}
			const status = statuses.get(traceId);
			statuses.delete(traceId);
			if (typeof status === 'number') a['http.response.status_code'] = status;
		},
		forceFlush: async () => {},
		shutdown: async () => {}
	};
}

export function startTracing(serviceName: string) {
	const dsn = process.env.PUBLIC_TRACEWAY_DSN?.trim() ?? '';
	const at = dsn.indexOf('@');
	if (at < 1) return;
	const exporter = new OTLPTraceExporter({
		url: `${new URL(dsn.slice(at + 1)).origin}/api/otel/v1/traces`,
		headers: { Authorization: `Bearer ${dsn.slice(0, at)}` }
	});
	const provider = new NodeTracerProvider({
		resource: resourceFromAttributes({ 'service.name': serviceName }),
		spanProcessors: [shapeSpans(), new BatchSpanProcessor(exporter)]
	});
	provider.register();
	// adapter-node emits this on SIGTERM/SIGINT once in-flight requests are done. The
	// last batch is best-effort: an unreachable Traceway must not fail the exit.
	process.on('sveltekit:shutdown', () => void provider.shutdown().catch(() => {}));
}
