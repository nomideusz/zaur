export type SettingsDetailLevel = 'basic' | 'advanced';

/** Titles that stay visible in basic mode even if they match advanced patterns. */
const BASIC_TITLE_OVERRIDES = new Set([
	'Compact layout',
	'List density',
	'Drawer width',
	'Apply simple mode',
	'Reset all display & layout settings',
	'Reset theme settings',
	'Reset layout settings',
	'Reset inbox settings',
	'Reset reading settings',
	'Reset writing settings',
	'Reset calendar settings',
	'Reset profile settings',
	'Reset general mail settings',
	'Export settings',
	'Import settings'
]);

/** Whole nav sections only shown in advanced mode. */
export const ADVANCED_ONLY_SETTINGS_PATHS = new Set(['/settings/data']);

export function isAdvancedSettingTitle(title: string): boolean {
	if (BASIC_TITLE_OVERRIDES.has(title)) return false;

	const lower = title.toLowerCase();
	return (
		lower.startsWith('compact ') ||
		lower.startsWith('hide ') ||
		lower.startsWith('minimal ') ||
		lower.includes('icon-only') ||
		lower.includes('skeleton')
	);
}

export function shouldShowSetting(
	level: SettingsDetailLevel,
	options: { advanced?: boolean; title?: string }
): boolean {
	if (level === 'advanced') return true;
	if (options.advanced === false) return true;
	if (options.advanced === true) return false;
	if (options.title) return !isAdvancedSettingTitle(options.title);
	return true;
}
