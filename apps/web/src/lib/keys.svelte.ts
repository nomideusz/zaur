// The svelte-i18n row's switch: on, `t` answers every message with its key,
// so the page shows what it is made of. The layout remounts the page on a
// flip, as the page computes much of its text once.
export const keys = $state({ on: false });
