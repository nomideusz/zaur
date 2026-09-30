import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setTimeout as sleep } from 'node:timers/promises';

import { addJob, jobsFor, removeJob, searchYouTube, tagsFor, videoIdFrom } from '../src/lib/server/youtube.ts';

test('videoIdFrom finds the video in YouTube and Bartube links', () => {
	const id = 'dQw4w9WgXcQ';
	for (const input of [
		id,
		`https://www.youtube.com/watch?v=${id}&list=RD${id}`,
		`https://music.youtube.com/watch?v=${id}`,
		`https://youtu.be/${id}?si=abc`,
		`https://www.youtube.com/shorts/${id}`,
		`https://bartube.zaur.app/watch/${id}`,
		`Check this out https://youtu.be/${id} via YouTube`
	]) {
		assert.equal(videoIdFrom(input), id, input);
	}
	assert.equal(videoIdFrom('https://example.com/'), null);
	assert.equal(videoIdFrom('not a link'), null);
});

test('tagsFor reads artist and title from a music upload', () => {
	assert.deepEqual(tagsFor({ id: 'x', title: 'Daft Punk - Around the World (Official Video)', channel: 'DaftPunkVEVO', upload_date: '20090617' }), {
		artist: 'Daft Punk',
		title: 'Around the World',
		album: 'Around the World',
		year: '2009'
	});
	// Topic channels carry real track metadata.
	assert.deepEqual(tagsFor({ id: 'x', title: 'Song', track: 'Song', artists: ['A', 'B'], album: 'LP', channel: 'A - Topic', release_year: 2020 }), {
		artist: 'A, B',
		title: 'Song',
		album: 'LP',
		year: '2020'
	});
	// No "Artist - Title": the channel is the artist.
	assert.equal(tagsFor({ id: 'x', title: 'Live at home', channel: 'Some Band - Topic' }).artist, 'Some Band');
});

test('searchYouTube keeps songs: no shorts, live streams or channels', async (t) => {
	process.env.YATTEE_URL = 'https://yattee.test/';
	const video = { type: 'video', videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', author: 'Rick Astley', lengthSeconds: 213 };
	const fetch = t.mock.method(globalThis, 'fetch', async () =>
		Response.json([
			video,
			{ ...video, videoId: 'short000000', isShort: true },
			{ ...video, videoId: 'live0000000', liveNow: true, lengthSeconds: 0 },
			{ type: 'channel', author: 'Rick Astley' }
		])
	);
	assert.deepEqual(await searchYouTube('rick astley'), [
		{ videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', author: 'Rick Astley', seconds: 213 }
	]);
	assert.equal(String(fetch.mock.calls[0].arguments[0]), 'https://yattee.test/api/v1/search?q=rick+astley&type=video');
	delete process.env.YATTEE_URL;
});

test('a failed add says why in plain words, and a retry replaces its row', async (t) => {
	process.env.YATTEE_URL = 'https://yattee.test/';
	process.env.MUSIC_DIR = '/nonexistent-music-dir';
	t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'This video is unavailable' }, { status: 500 }));
	t.mock.method(console, 'error', () => {});
	const me = 'retry@zaur.test';
	const failed = async () => {
		while (jobsFor(me)[0].status !== 'failed') await sleep(5);
		return jobsFor(me);
	};

	addJob('dQw4w9WgXcQ', me);
	const [first] = await failed();
	assert.equal(first.error, 'This video is unavailable');

	addJob('dQw4w9WgXcQ', me);
	const again = await failed();
	assert.equal(again.length, 1);
	assert.notEqual(again[0].id, first.id);

	removeJob(again[0].id, 'someone-else@zaur.test');
	assert.equal(jobsFor(me).length, 1);
	removeJob(again[0].id, me);
	assert.equal(jobsFor(me).length, 0);
	delete process.env.YATTEE_URL;
	delete process.env.MUSIC_DIR;
});
