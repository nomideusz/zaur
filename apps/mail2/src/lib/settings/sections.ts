/**
 * Settings' pages, in the order the side list shows them. Each is its own
 * route under /settings; the list, the page heading and the tab title all read
 * from here. Account is /settings itself, so a phone opens on your profile with
 * the list under it.
 *
 * The slugs steer clear of webmail 1.0's (`general`, `compose`, `display`…),
 * which `legacy-links.ts` redirects; the ones that match (`reading`,
 * `appearance`, `security`) mean the same page in both.
 */
export interface SettingsSection {
	href: string;
	label: string;
	/** One line under the heading: what the page is for. */
	blurb: string;
}

export const SETTINGS_GROUPS: { label: string; items: SettingsSection[] }[] = [
	{
		label: 'Account',
		items: [
			{ href: '/settings', label: 'Account', blurb: 'Who you are signed in as, and how much room your mail takes.' },
			{ href: '/settings/addresses', label: 'Addresses', blurb: 'The name recipients see and the signature new messages start with, per address.' },
			{ href: '/settings/security', label: 'Password & sign-in', blurb: 'Your password, two-factor authentication and where a reset link goes.' },
			{ href: '/settings/app-passwords', label: 'App passwords', blurb: 'Passwords for mail apps like Thunderbird or a phone, and keys for scripts.' },
			{ href: '/settings/devices', label: 'Devices', blurb: 'Browsers signed into this account. Sign out any you no longer use.' }
		]
	},
	{
		label: 'Mail',
		items: [
			{ href: '/settings/reading', label: 'Reading & writing', blurb: 'How the list and messages behave, and how new messages start. These follow your account to every device.' },
			{ href: '/settings/auto-reply', label: 'Auto-reply', blurb: "Answers incoming mail while you're away. The server sends it, so it works with Zaur closed." },
			{ href: '/settings/folders', label: 'Folders', blurb: 'Folders of your own, for filing by hand or by a rule. A folder can sit inside another.' },
			{ href: '/settings/rules', label: 'Rules & categories', blurb: 'What happens to mail as it arrives: filing, flagging, categorising.' },
			{ href: '/settings/sharing', label: 'Sharing', blurb: 'Let someone on this server see this mailbox next to their own — a shared inbox.' }
		]
	},
	{
		label: 'This device',
		items: [
			{ href: '/settings/appearance', label: 'Appearance', blurb: 'Theme and layout. They stay on this device, since a screen of its own may want another.' },
			{ href: '/settings/notifications', label: 'Notifications', blurb: 'New mail in your inbox, even when Zaur Mail is closed. Each device asks for itself.' }
		]
	}
];

const ALL = SETTINGS_GROUPS.flatMap((group) => group.items);

/** The page a path is on: the exact one, else the one it sits under, else Account. */
export function settingsSection(pathname: string): SettingsSection {
	const path = pathname.replace(/\/+$/, '') || '/';
	return (
		ALL.find((item) => item.href === path) ??
		ALL.find((item) => item.href !== '/settings' && path.startsWith(`${item.href}/`)) ??
		ALL[0]!
	);
}
