<script lang="ts">
	import { goto } from '$app/navigation';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { signOutAll, signOutOf, switchTo } from '#lib/accounts';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';
	import { whoami } from '../../../routes/session.remote';

	/**
	 * The person's identity tile and the menu behind it — who is signed in, the
	 * session's other accounts, the way to Settings and the way out.
	 *
	 * It reads the session itself and runs its own commands, because it sits in
	 * four headers (Mail, Contacts, Calendar, Settings) and threading an account
	 * plus three callbacks through each of them is how the tile came to exist on
	 * one page only. Nothing about it is mail-specific. A phone has no tile: the
	 * tab row's Settings wears it, and Settings → Account does this menu's job.
	 */
	let { class: className = '' }: { class?: string } = $props();

	const who = whoami();
	const session = $derived(who.current ?? null);
	const others = $derived((session?.accounts ?? []).filter((account) => !account.active));

	const initialsText = $derived(session ? initials(session.displayName ?? '', session.username) : '·');
	let failed = $state<string | null>(null);

	async function use(key: string) {
		failed = null;
		await switchTo(key).catch(() => (failed = 'Could not switch accounts.'));
	}

	async function signOutThis() {
		if (!session) return;
		failed = null;
		await signOutOf(session.key).catch(() => (failed = 'Could not sign out.'));
	}
</script>

{#if session}
	<Menu.Root positioning={{ placement: 'bottom-end', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
		<Menu.Trigger
			class="z-avatar cursor-pointer transition-[filter] hover:brightness-[0.97] {className}"
			style={identityStyle(session.username)}
			aria-label="Account"
		>
			{initialsText}
		</Menu.Trigger>
		<Portal>
			<Menu.Positioner>
				<Menu.Content class="z-menu z-40 w-60">
					<div class="mb-1 flex items-center gap-2.5 border-b border-[var(--z-hairline)] px-2 pt-1 pb-2.5">
						<span class="z-avatar" style={identityStyle(session.username)} aria-hidden="true">{initialsText}</span>
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
								{initials(other.displayName ?? '', other.username)}
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
{:else}
	<!-- The tile's place is kept while the session loads, so the tabs beside it do not shift when it arrives. -->
	<span class="size-[30px] shrink-0 {className}" aria-hidden="true"></span>
{/if}
