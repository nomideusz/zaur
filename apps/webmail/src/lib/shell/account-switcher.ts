/** Pure helpers for multi-account switcher chrome (island rail, sheet, UserMenu). */

export const ACCOUNT_RAIL_INLINE_MAX = 3;

export type AccountRailMode = 'hidden' | 'inline' | 'overflow';

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

/** Active account first, then the rest in existing order. */
export function orderedAccountsForSwitcher(
	accounts: readonly AccountSwitcherEntry[]
): AccountSwitcherEntry[] {
	const active = accounts.filter((account) => account.isActive);
	const rest = accounts.filter((account) => !account.isActive);
	return [...active, ...rest];
}

export function accountRailMode(accountCount: number): AccountRailMode {
	if (accountCount <= 1) return 'hidden';
	if (accountCount <= ACCOUNT_RAIL_INLINE_MAX) return 'inline';
	return 'overflow';
}
