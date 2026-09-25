/**
 * Webmail 1.0's URLs, for when webmail.zaur.app is served by mail2: bookmarks,
 * notifications already on screen, links in sent mail. Each lands on the
 * nearest mail2 page: 1.0's folder segment is the mailbox id, which is what
 * `?folder=` takes (`inbox` is the plain URL), and a thread opens through
 * `?thread=`. Search has no URL in mail2, so it lands on the inbox. Null = not
 * a 1.0 URL.
 */
const LEGACY_SETTINGS: Record<string, string> = {
	contacts: '/contacts',
	account: '/settings',
	general: '/settings',
	data: '/settings',
	calendar: '/settings',
	shortcuts: '/settings',
	compose: '/settings/reading',
	writing: '/settings/reading',
	mail: '/settings/reading',
	inbox: '/settings/reading',
	display: '/settings/appearance',
	layout: '/settings/appearance',
	sidebar: '/settings/appearance',
	workspace: '/settings/appearance'
};

export function legacyRedirect(url: URL, registerUrl?: string | null): string | null {
	const path = url.pathname.replace(/\/+$/, '') || '/';
	const account = url.searchParams.get('account');
	const home = (params: Record<string, string> = {}) => {
		const search = new URLSearchParams(params);
		if (account) search.set('account', account);
		return search.size ? `/?${search}` : '/';
	};

	if (path === '/mail/compose') return home({ to: url.searchParams.get('to') ?? '' });
	// /mail, /mail/<folder>, /mail/search, /mail/<folder>/<thread>
	const mail = /^\/mail(?:\/([^/]+)(?:\/([^/]+))?)?$/.exec(path);
	if (mail) {
		const params: Record<string, string> = {};
		if (mail[1] && mail[1] !== 'inbox' && mail[1] !== 'search') params.folder = decodeURIComponent(mail[1]);
		if (mail[2]) params.thread = decodeURIComponent(mail[2]);
		return home(params);
	}

	// 1.0's settings pages; `reading`, `appearance` and `security` are mail2's too.
	const setting = /^\/settings\/([^/]+)$/.exec(path)?.[1];
	if (setting && setting in LEGACY_SETTINGS) return LEGACY_SETTINGS[setting]!;
	const search = /^\/(calendar|contacts|files)\/search$/.exec(path);
	if (search) return `/${search[1]}`;

	if (path === '/register') {
		const target = registerUrl ? URL.parse(registerUrl) : null;
		if (!target) return '/login';
		url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
		return target.href;
	}
	return null;
}
