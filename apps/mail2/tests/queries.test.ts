import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// Kit 3 evicts a query's cache once nothing references it any more, and after
// that the query's `current` stops updating. Reading a result straight off a
// call (`whoami().current`) leaves nothing holding the query, so a page that
// fetched it fresh stayed on "Session ended". Hold the query in a const or a
// `$derived` and read from that.
test('queries: results are read from a held query, not straight off a call', () => {
	const src = new URL('../src/', import.meta.url);
	const offenders = readdirSync(src, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.svelte') || file.endsWith('.svelte.ts'))
		.flatMap((file) =>
			readFileSync(new URL(file, src), 'utf8')
				.split('\n')
				.flatMap((line, i) =>
					/\w\([^()]*\)\??\.(current|ready|loading|error)\b/.test(line) ? [`${file}:${i + 1}`] : []
				)
		);
	assert.deepEqual(offenders, []);
});
