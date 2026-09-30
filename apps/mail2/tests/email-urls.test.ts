import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyUrl, classifySrcset, editorAttribute, inlineImageSrc, linkAllowed } from '../src/lib/email/urls.ts';

const APP = 'https://webmail.zaur.app';

test('mail urls: every spelling of the app itself is the app', () => {
	for (const url of [
		'/oidc/logout',
		'oidc/logout',
		'',
		'   ',
		'?x',
		'#top',
		'.',
		'//webmail.zaur.app/oidc/logout',
		'\\\\webmail.zaur.app\\oidc\\logout',
		'/\\webmail.zaur.app/oidc/logout',
		' \t\nhttps://webmail.zaur.app/oidc/logout',
		'HTTPS://WEBMAIL.ZAUR.APP/oidc/logout',
		'ht\ntps://webmail.zaur.app/oidc/logout',
		'https:/oidc/logout',
		'https:oidc/logout',
		'https://webmail.zaur.app/x/../oidc/logout',
		// The same server under its fully qualified name.
		'https://webmail.zaur.app./oidc/logout',
		'https://user:pw@webmail.zaur.app/oidc/logout',
		'/%2foidc/logout',
		'\u0000/oidc/logout',
		// Cookies do not know about schemes or ports.
		'http://webmail.zaur.app/oidc/logout',
		'https://webmail.zaur.app:8443/oidc/logout',
		// Unreadable is not kept either.
		'https://',
		'http://[bad'
	]) {
		assert.equal(classifyUrl(url, APP), 'app', JSON.stringify(url));
	}
});

test('mail urls: other servers are remote, schemes that fetch nothing are inert', () => {
	for (const url of ['https://example.com/a.png', '//example.com/a.png', ' HTTP://example.com', '\\\\example.com\\a.png']) {
		assert.equal(classifyUrl(url, APP), 'remote', url);
	}
	for (const url of ['data:image/png;base64,AAAA', 'cid:logo@zaur', 'blob:https://webmail.zaur.app/1-2-3', 'tel:+48123', 'mailto:a@b.c']) {
		assert.equal(classifyUrl(url, APP), 'inert', url);
	}
});

test('mail urls: a srcset is as bad as its worst candidate', () => {
	assert.equal(classifySrcset('https://example.com/a.png 1x, https://example.com/b.png 2x', APP), 'remote');
	assert.equal(classifySrcset('data:image/png;base64,AAAA 1x', APP), 'inert');
	assert.equal(classifySrcset('', APP), 'inert');
	for (const srcset of [
		'/__probe/1 1x',
		'https://example.com/a.png 1x, /__probe/1 2x',
		// After a closing comma the browser reads `2x` as a URL of its own.
		'https://example.com/a.png, 2x',
		'2x',
		'https://example.com/a.png 1x,/__probe/1',
		'https://example.com/a.png\t1x\n,\n/__probe/1'
	]) {
		assert.equal(classifySrcset(srcset, APP), 'app', JSON.stringify(srcset));
	}
});

test('mail urls: only the inline-image address is let through, rebuilt', () => {
	const inline = '/api/jmap/download?blobId=b1&name=logo.svg&type=image%2Fsvg%2Bxml&inline=1';
	assert.equal(inlineImageSrc(inline, APP), inline);
	// A shared mailbox's images say whose they are; nothing else rides along.
	const shared = inline.replace('?', '?account=acc-team&');
	assert.equal(inlineImageSrc(shared, APP), shared);
	assert.equal(inlineImageSrc(`${inline}&download=1&x=/oidc/logout#x`, APP), inline);
	for (const url of [
		'/oidc/logout',
		'/api/download?blobId=b1&name=a.png&type=image/png&inline=1',
		'/api/jmap/download/../../oidc/logout?blobId=b1&type=image/png&inline=1',
		'/api/jmap/download?blobId=b1&type=text/html&inline=1',
		'/api/jmap/download?type=image/png&inline=1',
		'/api/jmap/download?blobId=b1&type=image/png',
		'https://example.com/api/jmap/download?blobId=b1&type=image/png&inline=1'
	]) {
		assert.equal(inlineImageSrc(url, APP), null, url);
	}
});

test('mail urls: links keep other sites, and this app only in full and only its pages', () => {
	for (const href of ['https://example.org/page', '//example.org/page', 'tel:+48123', 'https://webmail.zaur.app/meet/zaur-abc', 'https://webmail.zaur.app/?folder=archive']) {
		assert.equal(linkAllowed(href, APP), true, href);
	}
	for (const href of [
		'/oidc/logout',
		'#top',
		'',
		'//webmail.zaur.app/meet/zaur-abc',
		'https:/oidc/logout',
		'https://webmail.zaur.app/oidc/logout',
		'https://webmail.zaur.app/x/../oidc/logout',
		'https://webmail.zaur.app//oidc/logout',
		'https://webmail.zaur.app/%6fidc/logout',
		'https://webmail.zaur.app/OIDC/logout?post_logout_redirect_uri=x',
		'https://webmail.zaur.app\\auth\\claim?token=x',
		'https://webmail.zaur.app/api/events',
		'https://webmail.zaur.app/%ff'
	]) {
		assert.equal(linkAllowed(href, APP), false, href);
	}
});

test('compose editor: a draft brings in no picture but an inline image of ours, and nothing else that fetches', () => {
	const inline = '/api/jmap/download?blobId=b1&name=cat.png&type=image%2Fpng&inline=1';
	const img = (src: string) => editorAttribute('img', 'src', src, APP);
	assert.equal(img(inline), inline);
	assert.equal(img(`${inline}&x=/oidc/logout`), inline);
	assert.equal(img('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
	// null: the <img> does not survive (prepareEditorHtml removes one left without a src).
	for (const src of ['/oidc/logout', '', '?x', 'https://leak.example.com/pixel.png', '//leak.example.com/p.png', '/api/download?blobId=b1', 'https://music.zaur.app/auth/logout', 'cid:gone']) {
		assert.equal(img(src), null, JSON.stringify(src));
	}
	assert.equal(editorAttribute('video', 'src', inline, APP), null);
	for (const name of ['srcset', 'poster', 'background']) assert.equal(editorAttribute('img', name, inline, APP), null, name);
	assert.equal(editorAttribute('span', 'style', 'font-weight: bold', APP), 'font-weight: bold');
	assert.equal(editorAttribute('div', 'style', 'background: url(/oidc/logout)', APP), null);
	assert.equal(editorAttribute('a', 'href', 'https://example.org/', APP), 'https://example.org/');
	// A link is the reader's rule too: the app's own address only in full, and only a page (a Meet invitation).
	assert.equal(editorAttribute('a', 'href', 'https://webmail.zaur.app/meet/zaur-abcdefgh', APP), 'https://webmail.zaur.app/meet/zaur-abcdefgh');
	assert.equal(editorAttribute('a', 'href', 'mailto:ada@example.com', APP), 'mailto:ada@example.com');
	for (const href of ['/oidc/logout', '/calendar', 'https://webmail.zaur.app/oidc/logout', '//webmail.zaur.app/settings', '']) {
		assert.equal(editorAttribute('a', 'href', href, APP), null, JSON.stringify(href));
	}

	// Trix shows a figure from its JSON: the same rule for the address in there, and no markup.
	const figure = (attachment: unknown) => editorAttribute('figure', 'data-trix-attachment', JSON.stringify(attachment), APP);
	assert.equal(figure({ contentType: 'image/png', filename: 'cat.png', url: inline }), JSON.stringify({ contentType: 'image/png', filename: 'cat.png', url: inline }));
	for (const attachment of [{ url: '/oidc/logout' }, { url: 'https://leak.example.com/p.png' }, { url: inline, content: '<img src="/oidc/logout">' }, { content: '<b>x</b>' }, {}, null, 5]) {
		assert.equal(figure(attachment), null, JSON.stringify(attachment));
	}
	assert.equal(editorAttribute('figure', 'data-trix-attachment', '{not json', APP), null);
	// Trix wraps the picture in a link to `href`: it goes unless it could be a link in a message.
	assert.equal(figure({ url: inline, href: '/oidc/logout' }), JSON.stringify({ url: inline }));
	assert.equal(figure({ url: inline, href: 'https://example.org/' }), JSON.stringify({ url: inline, href: 'https://example.org/' }));
});
