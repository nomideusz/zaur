/** Watch a container for visible settings rows (respects essential/advanced filtering). */
export function observeVisibleSettingsRows(
	root: HTMLElement,
	onChange: (hasRows: boolean) => void
): () => void {
	const update = () => onChange(root.querySelector('[data-settings-row]') !== null);

	const observer = new MutationObserver(update);
	observer.observe(root, { childList: true, subtree: true });
	update();

	return () => observer.disconnect();
}
