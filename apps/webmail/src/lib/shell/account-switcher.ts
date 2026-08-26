/** Pure helpers for the multi-account UserMenu. */

export type AccountSwitcherEntry = {
	key: string;
	username: string;
	displayName: string;
	isActive: boolean;
};

/** Single-letter (or digit) avatar glyph from display name / username. */
export function accountInitial(displayName: string, username: string): string {
	const source = displayName.trim() || username.trim();
	if (!source) return '?';
	const letter = [...source][0];
	return letter ? letter.toUpperCase() : '?';
}

export function formatUnreadBadge(count: number): string {
	if (count <= 0) return '';
	return count > 99 ? '99+' : String(count);
}

/** Sum of unread on every account except the active one. */
export function otherAccountsUnreadSum(
	accounts: readonly AccountSwitcherEntry[],
	unread: Readonly<Record<string, number>>,
	activeKey: string | null | undefined
): number {
	let total = 0;
	for (const account of accounts) {
		if (account.key === activeKey || account.isActive) continue;
		total += unread[account.key] ?? 0;
	}
	return total;
}
