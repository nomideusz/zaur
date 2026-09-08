// Fire-and-forget error report to self-hosted Traceway (docs.tracewayapp.com/protocol).
// PUBLIC_TRACEWAY_DSN = {token}@{url}/api/report — the same public write-only DSN the
// browser SDK uses, so client and server errors land in one project. Unset = no-op.
import { env } from '$env/dynamic/public';

export function reportError(error: unknown, attributes: Record<string, string>) {
	const dsn = env.PUBLIC_TRACEWAY_DSN?.trim() ?? '';
	const at = dsn.indexOf('@');
	if (at < 1) return;
	const stackTrace =
		error instanceof Error ? (error.stack ?? `${error.name}: ${error.message}`) : String(error);
	fetch(dsn.slice(at + 1), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dsn.slice(0, at)}` },
		body: JSON.stringify({
			appVersion: '',
			serverName: 'webmail',
			collectionFrames: [
				{
					stackTraces: [
						{ stackTrace, recordedAt: new Date().toISOString(), isMessage: false, attributes }
					],
					metrics: [],
					traces: []
				}
			]
		})
	}).catch(() => {});
}
