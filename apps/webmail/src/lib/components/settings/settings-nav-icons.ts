import type { Component } from 'svelte';
import FileText from '$lib/components/icons/FileText.svelte';
import MailOpen from '$lib/components/icons/MailOpen.svelte';
import PenSquare from '$lib/components/icons/PenSquare.svelte';
import User from '$lib/components/icons/User.svelte';
import type { SettingsNavIcon } from '$lib/mail/config';

export const SETTINGS_NAV_ICON_MAP: Record<SettingsNavIcon, Component> = {
	account: User,
	reading: MailOpen,
	writing: PenSquare,
	shortcuts: FileText
};
