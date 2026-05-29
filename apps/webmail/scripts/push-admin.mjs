#!/usr/bin/env node

const USAGE = `Usage:
  node scripts/push-admin.mjs list [--url URL] [--token TOKEN]
  node scripts/push-admin.mjs test [--url URL] [--token TOKEN] [--id SUBSCRIPTION_ID] [--title TEXT] [--body TEXT]

Environment:
  PUSH_ADMIN_TOKEN   Bearer token (required for local/API calls)
  WEBMAIL_URL        Default base URL for --url (optional)

Examples:
  PUSH_ADMIN_TOKEN=secret node scripts/push-admin.mjs list
  node scripts/push-admin.mjs test --url https://webmail.zaur.app --token "$PUSH_ADMIN_TOKEN"
  node scripts/push-admin.mjs test --id abc123 --title "Hello" --body "Test notification"
`;

function parseArgs(argv) {
	const positional = [];
	const options = {};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--url') {
			options.url = argv[++i];
			continue;
		}
		if (arg === '--token') {
			options.token = argv[++i];
			continue;
		}
		if (arg === '--id') {
			options.id = argv[++i];
			continue;
		}
		if (arg === '--title') {
			options.title = argv[++i];
			continue;
		}
		if (arg === '--body') {
			options.body = argv[++i];
			continue;
		}
		if (arg === '--help' || arg === '-h') {
			options.help = true;
			continue;
		}
		positional.push(arg);
	}

	return { command: positional[0], options };
}

function getBaseUrl(options) {
	return (options.url || process.env.WEBMAIL_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function getToken(options) {
	const token = options.token || process.env.PUSH_ADMIN_TOKEN;
	if (!token?.trim()) {
		console.error('Missing PUSH_ADMIN_TOKEN (env or --token).');
		process.exit(1);
	}
	return token.trim();
}

async function callAdminApi(baseUrl, token, method, body) {
	const response = await fetch(`${baseUrl}/api/push/admin`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			...(body ? { 'Content-Type': 'application/json' } : {})
		},
		body: body ? JSON.stringify(body) : undefined
	});

	const text = await response.text();
	let payload;
	try {
		payload = text ? JSON.parse(text) : null;
	} catch {
		payload = text;
	}

	if (!response.ok) {
		const message =
			typeof payload === 'object' && payload && 'message' in payload
				? payload.message
				: typeof payload === 'string'
					? payload
					: JSON.stringify(payload);
		throw new Error(`${response.status} ${response.statusText}: ${message}`);
	}

	return payload;
}

function printList(payload) {
	console.log(`Push configured: ${payload.configured ? 'yes' : 'no'}`);
	console.log(`Admin enabled:   ${payload.adminEnabled ? 'yes' : 'no'}`);
	console.log(`Subscriptions:   ${payload.count}`);

	if (!payload.subscriptions?.length) {
		console.log('\nNo subscriptions stored.');
		return;
	}

	console.log('');
	for (const record of payload.subscriptions) {
		console.log(`- ${record.id}`);
		console.log(`  user:     ${record.username}`);
		console.log(`  service:  ${record.pushService}`);
		console.log(`  endpoint: ${record.endpointPreview}`);
		console.log(`  updated:  ${record.updatedAt}`);
		console.log(`  watcher:  emailState=${record.hasEmailState ? 'yes' : 'no'}, inbox=${record.inboxMailboxId ?? 'unset'}`);
	}
}

function printTest(payload) {
	console.log(`Sent:   ${payload.sent}`);
	console.log(`Failed: ${payload.failed}`);
	for (const result of payload.results ?? []) {
		const status = result.ok ? 'ok' : `failed (${result.error ?? 'unknown'})`;
		console.log(`- ${result.id} (${result.username}): ${status}`);
	}
}

async function main() {
	const { command, options } = parseArgs(process.argv.slice(2));

	if (options.help || !command || !['list', 'test'].includes(command)) {
		console.log(USAGE);
		process.exit(command && !options.help ? 1 : 0);
	}

	const baseUrl = getBaseUrl(options);
	const token = getToken(options);

	try {
		if (command === 'list') {
			printList(await callAdminApi(baseUrl, token, 'GET'));
			return;
		}

		const body = {};
		if (options.id) body.id = options.id;
		if (options.title) body.title = options.title;
		if (options.body) body.body = options.body;

		printTest(await callAdminApi(baseUrl, token, 'POST', body));
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

main();
