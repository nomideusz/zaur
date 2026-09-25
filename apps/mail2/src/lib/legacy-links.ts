/**
 * Webmail 1.0's URLs, for when webmail.zaur.app is served by mail2: bookmarks,
 * notifications already on screen, links in sent mail. Each lands on the
 * nearest mail2 page. Mail2 has no folder or search in the URL, so those land
 * on the inbox; a thread opens through `?thread=`. Null = not a 1.0 URL.
 */
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
	if (mail) return mail[2] ? home({ thread: mail[2] }) : home();

	if (path === '/settings/contacts') return '/contacts';
	if (path.startsWith('/settings/') && path !== '/settings/security') return '/settings';
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
