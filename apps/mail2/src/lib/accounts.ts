import { goto } from '$app/navigation';
import { signOutAccount, switchAccount } from '../routes/session.remote';
import { logout } from '../routes/login.remote';

/**
 * Switching and signing out, for the account menu and Settings → Account.
 *
 * The active account lives in the shared session, so a change here changes it
 * for every open tab: each one is told over a BroadcastChannel and reloads, so
 * none keeps showing — or composing in — an account that is no longer active.
 */
function announce() {
	if (typeof BroadcastChannel === 'undefined') return;
	const channel = new BroadcastChannel('zaur-mail2-account');
	channel.postMessage('changed');
	channel.close();
}

/** Make `key` the active account and start over on Mail. Throws if the switch fails. */
export async function switchTo(key: string): Promise<void> {
	await switchAccount({ key });
	announce();
	location.assign('/');
}

/** Sign out of one account: on to the next one still signed in, or to sign in. Throws if it fails. */
export async function signOutOf(key: string): Promise<void> {
	const { signedIn } = await signOutAccount({ key });
	announce();
	location.assign(signedIn ? '/' : '/login');
}

export function signOutAll(): void {
	announce();
	void logout().then(() => goto('/login', { replaceState: true }));
}
