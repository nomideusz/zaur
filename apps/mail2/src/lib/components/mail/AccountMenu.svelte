<script lang="ts">
	import { goto } from '$app/navigation';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { identityStyle } from '#lib/mail/colors';
	import { signOutAccount, switchAccount, whoami } from '../../../routes/session.remote';
	import { logout } from '../../../routes/login.remote';

	/**
	 * The person's identity tile and the menu behind it — who is signed in, the
	 * session's other accounts, the way to Settings and the way out.
	 *
	 * It reads the session itself and runs its own commands, because it sits in
	 * four headers (Mail, Contacts, Calendar, Settings) and threading an account
	 * plus three callbacks through each of them is how the tile came to exist on
	 * one page only. Nothing about it is mail-specific.
	 */
	let { class: className = '' }: { class?: string } = $props();

	const session = $derived(whoami()?.current ?? null);
	const others = $derived((session?.accounts ?? []).filter((account) => !account.active));

	function initialsOf(name: string, email: string): string {
		const source = name.trim() || email.trim();
		if (!source) return '?';
		if (!name.trim() && source.includes('@'))
			return source.slice(0, source.indexOf('@')).slice(0, 2).toUpperCase();
		const parts = source.split(/[\s@._-]+/).filter(Boolean);
		return parts.length === 1
			? source.slice(0, 2).toUpperCase()
			: ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase();
	}

	const initials = $derived(session ? initialsOf(session.displayName ?? '', session.username) : '·');
	let failed = $state<string | null>(null);

	/**
	 * The active account lives in the shared session, so a switch here changes it
	 * for every open tab: each one is told over a BroadcastChannel and reloads, so
	 * none keeps showing — or composing in — the account that is no longer active.
	 */
	function announce() {
		if (typeof BroadcastChannel === 'undefined') return;
		const channel = new BroadcastChannel('zaur-mail2-account');
		channel.postMessage('changed');
		channel.close();
	}

	async function use(key: string) {
		failed = null;
		try {
			await switchAccount({ key });
		} catch {
			failed = 'Could not switch accounts.';
			return;
		}
		announce();
		location.assign('/');
	}

	async function signOutThis() {
		if (!session) return;
		failed = null;
		try {
			const { signedIn } = await signOutAccount({ key: session.key });
			announce();
			location.assign(signedIn ? '/' : '/login');
		} catch {
			failed = 'Could not sign out.';
		}
	}

	function signOutAll() {
		announce();
		void logout().then(() => goto('/login', { replaceState: true }));
	}
</script>

{#if session}
	<Menu.Root positioning={{ placement: 'bottom-end', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
		<Menu.Trigger
			class="z-avatar cursor-pointer transition-[filter] hover:brightness-[0.97] {className}"
			style={identityStyle(session.username)}
			aria-label="Account"
		>
			{initials}
		</Menu.Trigger>
		<Portal>
			<Menu.Positioner>
				<Menu.Content class="z-menu z-40 w-60">
					<div class="mb-1 flex items-center gap-2.5 border-b border-[var(--z-hairline)] px-2 pt-1 pb-2.5">
						<span class="z-avatar" style={identityStyle(session.username)} aria-hidden="true">{initials}</span>
						<span class="min-w-0">
							<span class="block truncate text-[13px] font-semibold text-[var(--z-ink)]">
								{session.displayName ?? session.username}
							</span>
							<span class="z-mono block truncate text-[10.5px] text-[var(--z-soft)]">{session.username}</span>
						</span>
					</div>

					{#if failed}
						<p class="mb-1 px-2 text-[12px] text-[var(--z-ch-discard-ink)]" role="alert">{failed}</p>
					{/if}

					<!-- Other accounts in this session: one click makes it the active one. -->
					{#each others as other (other.key)}
						<Menu.Item
							value="account:{other.key}"
							class="z-menu-item !h-auto gap-2.5 !py-1.5"
							onSelect={() => void use(other.key)}
						>
							<span class="z-avatar !size-6 !text-[10px]" style={identityStyle(other.username)} aria-hidden="true">
								{initialsOf(other.displayName ?? '', other.username)}
							</span>
							<span class="min-w-0">
								<span class="block truncate text-[12.5px] text-[var(--z-ink)]">
									{other.displayName ?? other.username}
								</span>
								<span class="z-mono block truncate text-[10px] text-[var(--z-soft)]">{other.username}</span>
							</span>
						</Menu.Item>
					{/each}
					<Menu.Item value="add-account" class="z-menu-item" onSelect={() => goto('/login?mode=add')}>
						Add account
					</Menu.Item>

					<div class="my-1 h-px bg-[var(--z-hairline)]" aria-hidden="true"></div>
					<!-- The section tabs hide below `sm`; the menu is the phone's way there. -->
					<Menu.Item value="mail" class="z-menu-item sm:hidden" onSelect={() => goto('/')}>Mail</Menu.Item>
					<Menu.Item value="contacts" class="z-menu-item sm:hidden" onSelect={() => goto('/contacts')}>Contacts</Menu.Item>
					<Menu.Item value="calendar" class="z-menu-item sm:hidden" onSelect={() => goto('/calendar')}>Calendar</Menu.Item>
					<Menu.Item value="settings" class="z-menu-item" onSelect={() => goto('/settings')}>Settings</Menu.Item>

					{#if others.length > 0}
						<Menu.Item
							value="signout-account"
							class="z-menu-item !text-[var(--z-ch-discard-ink)] data-highlighted:!bg-[var(--z-ch-discard-hover)]"
							onSelect={() => void signOutThis()}
						>
							Sign out of this account
						</Menu.Item>
					{/if}
					<Menu.Item
						value="signout"
						class="z-menu-item !text-[var(--z-ch-discard-ink)] data-highlighted:!bg-[var(--z-ch-discard-hover)]"
						onSelect={signOutAll}
					>
						{others.length > 0 ? 'Sign out of all accounts' : 'Sign out'}
					</Menu.Item>
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu.Root>
{/if}
