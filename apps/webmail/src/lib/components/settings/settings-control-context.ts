/** Row/field label + description ids for associating settings controls. */
export const SETTINGS_A11Y = Symbol('settings-a11y');

export type SettingsA11yContext = {
	labelId: string;
	descId?: string;
	controlId?: string;
};
