import { getContext, setContext } from 'svelte';
import type { WebmailModeDefinition } from './types';

const WEBMAIL_MODE_CONTEXT = Symbol('webmail-mode');

/** Provide reactive access to the active mode from mail/settings shells. */
export function setWebmailModeContext(getDefinition: () => WebmailModeDefinition): void {
	setContext(WEBMAIL_MODE_CONTEXT, getDefinition);
}

/** Read the active mode from a mode shell. */
export function getWebmailModeContext(): WebmailModeDefinition {
	const getDefinition = getContext<() => WebmailModeDefinition>(WEBMAIL_MODE_CONTEXT);
	return getDefinition();
}

/** Read the active mode when optional (outside a mode shell). */
export function tryGetWebmailModeContext(): WebmailModeDefinition | null {
	const getDefinition = getContext<(() => WebmailModeDefinition) | undefined>(WEBMAIL_MODE_CONTEXT);
	return getDefinition ? getDefinition() : null;
}
