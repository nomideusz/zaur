/**
 * Names and marks, from the PUBLIC_* variables in src/env.ts. Unset, the app is
 * a plain "Webmail" with an envelope; Zaur's deployment sets its own.
 */
import { PUBLIC_APP_ICON, PUBLIC_APP_NAME, PUBLIC_BRAND_NAME, PUBLIC_MAIL_DOMAIN } from '$app/env/public';

export const appName = PUBLIC_APP_NAME;
/** The sign-in card's wordmark. */
export const brandName = PUBLIC_BRAND_NAME ?? PUBLIC_APP_NAME;
/** "your Zaur address" with a brand, else "your email address". */
export const addressKind = PUBLIC_BRAND_NAME ? `${PUBLIC_BRAND_NAME} address` : 'email address';
export const meetName = PUBLIC_BRAND_NAME ? `${PUBLIC_BRAND_NAME} Meet` : 'Meet';
export const mailDomain = PUBLIC_MAIL_DOMAIN;
/** Where the icon files are: static/icons/{mail,zaur}/ (scripts/generate-icons.py). */
export const iconBase = `/icons/${PUBLIC_APP_ICON}`;

/**
 * The mark on a 16-unit grid, faint stroke then bold, as scripts/generate-icons.py
 * draws it: Zaur's Z that folds an envelope, or a plain envelope.
 */
export const MARK =
	PUBLIC_APP_ICON === 'zaur'
		? { faint: 'M2 4V12M14 4V12M2 4L8 8', bold: 'M2 4H14L2 12H14' }
		: { faint: 'M2 4L8 8L14 4', bold: 'M2 4H14V12H2Z' };
