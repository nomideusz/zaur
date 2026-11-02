/**
 * Meet inside the Android app: the call itself runs on the app's native screen
 * (ADR-0006, `apps/mobile/android/.../ZaurMeetPlugin.kt`). The page keeps the lobby
 * and mints the ticket as it does in a browser, then hands the ticket over.
 *
 * Capacitor puts its bridge on every page the app loads, so nothing is imported:
 * in a browser, or in an app build without the plugin, there is no `ZaurMeet` and
 * the call runs on the web as before.
 */

/** What the native screen reports when the call is over; the page's `CallEnd`. */
export interface NativeCallEnd {
	elapsed: number;
	others: number;
	failed?: string;
}

interface ZaurMeet {
	join(options: { wsUrl: string; token: string; micOn: boolean; camOn: boolean }): Promise<NativeCallEnd>;
}

interface CapacitorBridge {
	isNativePlatform?(): boolean;
	isPluginAvailable?(name: string): boolean;
	registerPlugin?<T>(name: string): T;
}

let plugin: ZaurMeet | null | undefined;

/** The app's native call screen, or null where there is none. */
export function nativeMeet(): ZaurMeet | null {
	if (plugin !== undefined) return plugin;
	const cap = typeof window === 'undefined' ? undefined : (window as { Capacitor?: CapacitorBridge }).Capacitor;
	plugin =
		cap?.isNativePlatform?.() && cap.isPluginAvailable?.('ZaurMeet') && cap.registerPlugin
			? cap.registerPlugin<ZaurMeet>('ZaurMeet')
			: null;
	return plugin;
}
