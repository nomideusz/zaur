/**
 * Best-effort haptic tick. Android Chrome vibrates; iOS Safari has no
 * vibration API and silently no-ops — visual feedback must stand alone.
 */
export function haptic(pattern: number | number[] = 8): void {
	if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
	try {
		navigator.vibrate(pattern);
	} catch {
		// Some browsers throw on vibrate without user activation.
	}
}
