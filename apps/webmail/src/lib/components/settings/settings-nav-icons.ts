import type { Component } from 'svelte';
import MailOpen from '$lib/components/icons/MailOpen.svelte';
import Palette from '$lib/components/icons/Palette.svelte';
import User from '$lib/components/icons/User.svelte';
import type { SettingsNavIcon } from '$lib/mail/config';

export const SETTINGS_NAV_ICON_MAP: Record<SettingsNavIcon, Component> = {
	account: User,
	mail: MailOpen,
	general: Palette
};
