import { getContext, setContext } from 'svelte';
import { WEBMAIL_MODE } from './registry';
import type { WebmailModeDefinition } from './types';

const WEBMAIL_MODE_CONTEXT = Symbol('webmail-mode');

export function setWebmailModeContext(): void {
	setContext(WEBMAIL_MODE_CONTEXT, () => WEBMAIL_MODE);
}

export function getWebmailModeContext(): WebmailModeDefinition {
	const getDefinition = getContext<(() => WebmailModeDefinition) | undefined>(WEBMAIL_MODE_CONTEXT);
	return getDefinition?.() ?? WEBMAIL_MODE;
}

export function tryGetWebmailModeContext(): WebmailModeDefinition {
	const getDefinition = getContext<(() => WebmailModeDefinition) | undefined>(WEBMAIL_MODE_CONTEXT);
	return getDefinition?.() ?? WEBMAIL_MODE;
}
