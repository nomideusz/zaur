/**
 * Who a calendar or a file is being shared with. People are typed as an address, but
 * JMAP shares with a principal, so the address is looked up in the server's
 * directory first — the rule 1.0 used: an exact address wins, otherwise the
 * search has to have come back with exactly one other person.
 */
import type { JMAPPrincipal } from '@zaur/mail-core';

export type PrincipalPick = { person: JMAPPrincipal } | { error: string };

export function pickPrincipal(
	matches: readonly JMAPPrincipal[],
	typed: string,
	selfId: string | null
): PrincipalPick {
	const others = matches.filter((person) => person.id !== selfId);
	const wanted = typed.trim().toLowerCase();
	const person = others.find((one) => one.email?.toLowerCase() === wanted) ?? (others.length === 1 ? others[0] : undefined);
	if (person) return { person };
	if (others.length) return { error: 'Several people matched. Type their exact address.' };
	return {
		error: matches.length
			? 'That is you — it is yours already.'
			: 'Nobody with that address has an account on this server.'
	};
}
