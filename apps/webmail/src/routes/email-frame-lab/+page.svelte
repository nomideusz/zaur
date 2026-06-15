<script lang="ts">
	// Dev-only playground + e2e fixture for EmailHtmlFrame (see tests/e2e/email-frame-lab.spec.ts).
	// 404'd in production via +page.ts. Renders untrusted-shaped email HTML in the sandboxed
	// iframe so isolation (no scripts), auto-height, and link hardening can be exercised.
	import EmailHtmlFrame from '$lib/components/mail/EmailHtmlFrame.svelte';

	// A "hostile" body: an inline script (must never run), a tall block (drives height), an
	// external link (should be target=_blank), and a wide table (reflow / overflow).
	const hostile = `
		<p id="lead">Hello from inside the frame.</p>
		<script>window.parent.__pwned = true;<\/script>
		<a id="ext" href="https://example.com/landing">External link</a>
		<div id="tall" style="height: 800px; background: #eee;">tall block</div>
		<table id="wide"><tr><td style="width: 2000px;">very wide cell</td></tr></table>
	`;

	let mode = $state<'html' | 'short'>('html');
	const short = `<p id="lead">One line.</p>`;
	const html = $derived(mode === 'short' ? short : hostile);
</script>

<div style="max-width: 40rem; margin: 2rem auto; font-family: sans-serif; display: flex; flex-direction: column; gap: 0.75rem;">
	<h1>email-frame-lab</h1>
	<div style="display: flex; gap: 0.5rem;">
		<button data-testid="mode-html" onclick={() => (mode = 'html')}>tall body</button>
		<button data-testid="mode-short" onclick={() => (mode = 'short')}>short body</button>
	</div>
	<div data-testid="frame-host" style="border: 1px solid #ccc;">
		<EmailHtmlFrame {html} darkMode={false} lightSurface={false} />
	</div>
</div>
