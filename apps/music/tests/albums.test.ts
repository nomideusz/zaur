import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setTimeout as sleep } from 'node:timers/promises';

import { pickUpload, sameSong, type AlbumTrack } from '../src/lib/server/albums.ts';
import { addJob, jobsFor, retryJob } from '../src/lib/server/youtube.ts';

const track = (title: string, seconds: number): AlbumTrack => ({
	title,
	seconds,
	artist: 'Depeche Mode',
	albumArtist: 'Depeche Mode',
	album: 'Some Great Reward',
	track: 1
});
const hit = (title: string, seconds: number, author = 'Depeche Mode') => ({ videoId: title.slice(0, 11).padEnd(11, '0'), title, author, seconds });

test('pickUpload takes the album audio from the artist, about as long', () => {
	const hits = [
		hit('Depeche Mode - Somebody (Official Video)', 272),
		hit('Depeche Mode Somebody cover', 267, 'Some Fan'),
		hit('Somebody', 268, 'Depeche Mode - Topic'),
		hit('Somebody (Live in Hamburg)', 268)
	];
	assert.equal(pickUpload(track('Somebody', 267), hits)?.title, 'Somebody');
	// Not a longer one, a live take or a cover; nothing rather than the wrong song.
	assert.equal(pickUpload(track('Somebody', 267), hits.slice(0, 2).concat(hits[3]))?.title, 'Depeche Mode - Somebody (Official Video)');
	assert.equal(pickUpload(track('Somebody', 200), hits), null);
});

test('pickUpload wants the same take, and the title as whole words', () => {
	const hits = [hit('People Are People (Remastered 2022)', 233), hit('People Are People (Live in Hamburg)', 259)];
	assert.equal(pickUpload(track('People Are People (Live in Basel)', 259), hits), null);
	assert.equal(pickUpload(track('People Are People', 232), hits)?.title, 'People Are People (Remastered 2022)');
	// "Do" is a word in this title, not a song in it.
	assert.equal(pickUpload(track('Do', 226), [hit("You Don't Know What Love Is (You Just Do as You're Told)", 226)]), null);
});

test('sameSong: a remaster is the song, a live take is not', () => {
	assert.ok(sameSong('Hurricane', 'hurricane (2003 Remaster)'));
	assert.ok(!sameSong('Hurricane', 'Hurricane (Live)'));
	assert.ok(sameSong('Hurricane (Live)', 'Hurricane (Live)'));
});

test("an album's track is looked for on YouTube, and a retry looks again", async (t) => {
	process.env.YATTEE_URL = 'https://yattee.test/';
	const asked: string[] = [];
	t.mock.method(globalThis, 'fetch', async (url: string) => (asked.push(String(url)), Response.json([])));
	t.mock.method(console, 'error', () => {});
	const me = 'album@zaur.test';
	const failed = async () => {
		while (jobsFor(me)[0].status !== 'failed') await sleep(5);
		return jobsFor(me)[0];
	};

	const job = addJob(track('Lie to Me', 303), me);
	assert.equal(job.album, 'Some Great Reward');
	assert.equal(job.videoId, undefined);
	const first = await failed();
	assert.match(first.error!, /Not found on YouTube/);
	assert.match(asked[0], /search\?q=Depeche\+Mode\+Lie\+to\+Me/);

	// The same track again is the same row, not a second one.
	retryJob(first.id, me);
	addJob(track('Lie to Me', 303), me);
	await failed();
	assert.equal(jobsFor(me).length, 1);
	assert.equal(asked.length, 2);
	delete process.env.YATTEE_URL;
});
