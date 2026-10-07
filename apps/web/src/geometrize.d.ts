// `import placeholder from './photo.webp?…&geometrize'` resolves, through the
// svelte-geometrize Vite plugin, to a placeholder fitted at build time. This is
// a script file on purpose: a wildcard module can't be declared from a module.
declare module '*&geometrize' {
	const placeholder: import('@nomideusz/svelte-geometrize').GeometrizePlaceholder;
	export default placeholder;
}
