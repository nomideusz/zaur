/**
 * Best-effort haptic tick. Android Chrome vibrates; iOS Safari has no
 * vibration API and silently no-ops — visual feedback must stand alone.
 */
export function haptic(pattern: number | number[] = 8): void {
	if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
	// Chrome blocks (and console-warns about) vibrate before the first tap on
	// the page — sticky activation is the exact condition it checks.
	if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
	try {
		navigator.vibrate(pattern);
	} catch {
		// Some browsers throw on vibrate without user activation.
	}
}
