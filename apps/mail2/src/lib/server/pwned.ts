import { createHash } from 'node:crypto';

/**
 * How many times a password shows up in known breaches (Have I Been Pwned's
 * Pwned Passwords, no key). Only the first 5 hex characters of its SHA-1 leave
 * the server, padded so the answer's size says nothing either. Unreachable
 * counts as 0: a password change is not blocked by somebody else's outage.
 * Register has the same check for signup and reset (`apps/register/lib/pwned.js`).
 */
export async function breachCount(password: string): Promise<number> {
	const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
	try {
		const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
			headers: { 'Add-Padding': 'true', 'User-Agent': 'zaur-mail' },
			signal: AbortSignal.timeout(4000)
		});
		if (!response.ok) throw new Error(`Pwned Passwords answered ${response.status}`);
		const line = (await response.text()).split('\n').find((row) => row.startsWith(`${hash.slice(5)}:`));
		return line ? Number(line.split(':')[1]) || 0 : 0;
	} catch (cause) {
		console.warn('[pwned] check skipped:', cause instanceof Error ? cause.message : cause);
		return 0;
	}
}

export const BREACHED = 'This password has appeared in a data breach, so it is on the lists attackers try first. Choose another.';
