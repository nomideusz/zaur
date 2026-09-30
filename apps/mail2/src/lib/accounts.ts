import { signOutAccount, switchAccount } from '../routes/session.remote';
import { logout } from '../routes/login.remote';
import { compose } from './compose/store.svelte.ts';
import { messageOf } from './errors';

/**
 * Switching and signing out, for the account menu and Settings → Account.
 *
 * The active account lives in the shared session, so a change here changes it
 * for every open tab: each one is told over a BroadcastChannel and reloads, so
 * none keeps showing — or composing in — an account that is no longer active.
 * What was typed in the last moment is saved first, while the session still takes it.
 */
/**
 * One channel a tab, for telling and for hearing: a channel never hears what
 * it said itself. A second one made to announce was heard by the tab's own
 * listener, whose reload of the address in the bar beat the move to `/login`
 * — and came back from the server as `/login?next=` the thread just left.
 */
let channel: BroadcastChannel | null = null;
function tabChannel(): BroadcastChannel | null {
	if (typeof BroadcastChannel === 'undefined') return null;
	return (channel ??= new BroadcastChannel('zaur-mail2-account'));
}

/** Tell the other tabs the session's account changed. */
export function announce() {
	tabChannel()?.postMessage('changed');
}

/** Hear it from another tab. Returns the way to stop listening. */
export function onAccountChange(heard: () => void): () => void {
	const listening = tabChannel();
	listening?.addEventListener('message', heard);
	return () => listening?.removeEventListener('message', heard);
}

/** Make `key` the active account and start over on Mail. Throws if the switch fails. */
export async function switchTo(key: string): Promise<void> {
	await compose.flush();
	await switchAccount({ key });
	announce();
	location.assign('/');
}

/** Sign out of one account: on to the next one still signed in, or to sign in. Throws if it fails. */
export async function signOutOf(key: string): Promise<void> {
	await compose.flush();
	const { signedIn } = await signOutAccount({ key });
	announce();
	location.assign(signedIn ? '/' : '/login');
}

/**
 * Sign out of everything. A full page load, like the two above: a client-side
 * `goto` kept the app's pages and their cached session in memory, so Back
 * brought the shell straight back without asking the server who was there.
 */
export function signOutAll(): void {
	void compose.flush().then(() => logout()).then(() => {
		announce();
		location.assign('/login');
	});
}

/** A preference that did not reach the account: said, for `adoptAccountPrefs`, which has put it back. */
export function prefNotSaved(cause: unknown): void {
	compose.pushToast({ text: messageOf(cause, 'The setting was not saved'), tone: 'error' });
}
