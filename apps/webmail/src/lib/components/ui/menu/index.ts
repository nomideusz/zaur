/**
 * Svelte port of Shark UI `@shark/menu` (sharkui-inc/shark-ui registry).
 * Built on @ark-ui/svelte menu; compose with action-bar `example-menu` for bulk select.
 *
 * These primitives own all menu markup in the app: root, trigger, the portalled
 * surface (`MenuSurface`), items and separators. The higher-level
 * `ui/OverflowMenu` / `ui/OverflowMenuItem` wrappers compose them too.
 */
export { default as Menu } from './Menu.svelte';
export { default as MenuContent } from './MenuContent.svelte';
export { default as MenuSurface } from './MenuSurface.svelte';
export { default as MenuItem } from './MenuItem.svelte';
export { default as MenuSeparator } from './MenuSeparator.svelte';
export { default as MenuTrigger } from './MenuTrigger.svelte';
