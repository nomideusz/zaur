import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { reportError } from '../src/lib/server/report.ts';

test('reportError: unset DSN sends nothing, a set one posts a Traceway frame', async () => {
	let hits = 0;
	const got = new Promise<{ auth?: string; path?: string; body: any }>((resolve) => {
		const srv = createServer((req, res) => {
			hits++;
			let body = '';
			req.on('data', (c) => (body += c));
			req.on('end', () => {
				res.end();
				srv.close();
				resolve({ auth: req.headers.authorization, path: req.url, body: JSON.parse(body) });
			});
		});
		srv.listen(0, '127.0.0.1', () => {
			const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/report`;
			process.env.PUBLIC_TRACEWAY_DSN = '';
			reportError(new Error('ignored'), {});
			process.env.PUBLIC_TRACEWAY_DSN = `tok123@${url}`;
			reportError(new Error('boom'), { where: 'api/upload' });
		});
	});
	const { auth, path, body } = await got;
	assert.equal(hits, 1);
	assert.equal(auth, 'Bearer tok123');
	assert.equal(path, '/api/report');
	assert.equal(body.serverName, 'mail2');
	const st = body.collectionFrames[0].stackTraces[0];
	assert.match(st.stackTrace, /^Error: boom/);
	assert.equal(st.attributes.where, 'api/upload');
});
