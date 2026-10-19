import type { Cookies } from '@sveltejs/kit';
import { writeSession } from '@zaur/server-auth';

/**
 * The public demo (demo.zaur.app, framed on zaur.app) runs over the fake JMAP
 * server from tests/smoke, which the container starts and resets every 30
 * minutes. Every visitor is signed in to its sample mailbox on arrival, and
 * nothing reaches a real mail server: sending only logs.
 */
export const DEMO_JMAP_URL = process.env.DEMO_JMAP_URL?.trim() || null;

export function signInDemo(cookies: Cookies) {
	writeSession(cookies, {
		serverUrl: DEMO_JMAP_URL!,
		username: 'smoke@zaur.app',
		displayName: 'Smoke Tester',
		authMethod: 'password',
		password: 'not-a-real-password'
	});
}
