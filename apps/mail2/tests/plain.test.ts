import { test } from 'node:test';
import assert from 'node:assert/strict';
import { richToText } from '../src/lib/compose/plain.ts';

test('richToText: the text part of what Trix writes', () => {
	assert.equal(richToText('<div>Hi&nbsp;&nbsp;there<br><br>Bye &amp; <strong>thanks</strong></div>'), 'Hi  there\n\nBye & thanks');
	assert.equal(richToText('<div><br></div><blockquote>On Monday, Ann wrote:<br>Lunch?<br><br>A</blockquote>'), '\n> On Monday, Ann wrote:\n> Lunch?\n>\n> A');
	assert.equal(
		richToText('<ul><li>one</li><li>two<ul><li>deep</li></ul></li></ul><ol><li>first</li><li>second</li></ol>'),
		'- one\n- two\n  - deep\n1. first\n2. second'
	);
	assert.equal(
		richToText('<div>See <a href="https://x.test/a?b=1&amp;c=2">the doc</a>, <a href="https://x.test">https://x.test</a>, <a href="mailto:a@b.c">a@b.c</a></div>'),
		'See the doc <https://x.test/a?b=1&c=2>, https://x.test, a@b.c'
	);
	assert.equal(
		richToText('<div>Look<figure data-trix-attachment="{&quot;url&quot;:&quot;/x.png&quot;}" data-x="a>b"><img src="/x.png"><figcaption class="attachment__caption"></figcaption></figure>ok</div>'),
		'Look\n[image]\nok'
	);
	assert.equal(richToText('<figure><img src="/y.png"><figcaption class="attachment__caption attachment__caption--edited">The view</figcaption></figure>'), '[image]\nThe view');
	assert.equal(richToText('<h1>Title</h1><pre>a &lt; b\n  c</pre><div>x</div>'), 'Title\na < b\n  c\nx');
	assert.equal(richToText('<div>-- <br>Ann</div>'), '-- \nAnn');
	assert.equal(richToText(''), '');
});
