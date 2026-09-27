import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tagsFor, videoIdFrom } from '../src/lib/server/youtube.ts';

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
