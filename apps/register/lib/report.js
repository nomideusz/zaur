// Fire-and-forget error report to self-hosted Traceway (docs.tracewayapp.com/protocol).
// TRACEWAY_DSN = {token}@{url}/api/report. Unset → console only, so local dev is safe.
const dsn = (process.env.TRACEWAY_DSN || '').trim();
const at = dsn.indexOf('@');
const endpoint = at > 0 ? dsn.slice(at + 1) : '';
const token = at > 0 ? dsn.slice(0, at) : '';

function reportError(err, attributes = {}) {
  const stackTrace = err instanceof Error ? err.stack || `${err.name}: ${err.message}` : String(err);
  console.error(`${attributes.where || 'error'}:`, err instanceof Error ? err.message : err);
  if (!endpoint) return;
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      appVersion: '',
      serverName: 'register',
      collectionFrames: [
        {
          stackTraces: [{ stackTrace, recordedAt: new Date().toISOString(), isMessage: false, attributes }],
          metrics: [],
          traces: [],
        },
      ],
    }),
  }).catch(() => {});
}

module.exports = { reportError, tracewayOrigin: endpoint ? new URL(endpoint).origin : '' };
