import { getContext, setContext, type Snippet } from 'svelte';

/**
 * The shell's header belongs to the `(app)` layout, so the mark, the section
 * tabs and the account tile mount once and stay put while the sections change
 * under them. What a section adds to the bar is its own, so it hands the
 * layout a snippet: snippets close over the page's state, which is how Mail's
 * search field lives in the layout's header and still belongs to Mail.
 */
export class Shell {
	/** The current section's part of the header. */
	bar = $state.raw<Snippet>();
	/** Classes for the whole header: Mail steps it out on a phone reading a thread. */
	barClass = $state('');
	/** The app column, for whoever positions floating things against it. */
	frame = $state<HTMLElement | null>(null);
	/**
	 * Who holds the bar — deliberately not state. An effect's teardown reads
	 * state as it was before the change that ran it, so a section leaving would
	 * still see itself in `bar` and wipe the one its successor just set.
	 */
	owner: Snippet | undefined;
}

// A string, not a Symbol: Vite's HMR can hold two instances of this module at
// once, and each would mint its own Symbol, so the layout and the page would
// miss each other's context until the dev server restarted.
const KEY = 'zaur:shell';

export function provideShell(): Shell {
	return setContext(KEY, new Shell());
}

/** Undefined outside the `(app)` layout — `/prototype` draws its own header. */
export function getShell(): Shell | undefined {
	return getContext<Shell | undefined>(KEY);
}

/**
 * Put `bar` in the shell's header for as long as the caller is mounted. The
 * next section claims the bar before or after this one lets go, so letting go
 * only clears what is still ours.
 */
export function useShellBar(shell: Shell, bar: Snippet, barClass: () => string = () => ''): void {
	// Two effects: a changing class must not drop and re-claim the bar, which
	// would rebuild Mail's search field under the person typing in it.
	$effect.pre(() => {
		shell.owner = bar;
		shell.bar = bar;
		return () => {
			if (shell.owner !== bar) return;
			shell.owner = undefined;
			shell.bar = undefined;
			shell.barClass = '';
		};
	});
	$effect.pre(() => {
		if (shell.owner === bar) shell.barClass = barClass();
	});
}
