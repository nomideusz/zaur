import type { Component } from 'svelte';
import Calendar from '$lib/components/icons/Calendar.svelte';
import Database from '$lib/components/icons/Database.svelte';
import FileText from '$lib/components/icons/FileText.svelte';
import MailOpen from '$lib/components/icons/MailOpen.svelte';
import Palette from '$lib/components/icons/Palette.svelte';
import PenSquare from '$lib/components/icons/PenSquare.svelte';
import User from '$lib/components/icons/User.svelte';
import Shield from '$lib/components/icons/Shield.svelte';
import type { SettingsNavIcon } from '$lib/mail/config';

export const SETTINGS_NAV_ICON_MAP: Record<SettingsNavIcon, Component> = {
	account: User,
	security: Shield,
	appearance: Palette,
	reading: MailOpen,
	writing: PenSquare,
	calendar: Calendar,
	data: Database,
	shortcuts: FileText
};
