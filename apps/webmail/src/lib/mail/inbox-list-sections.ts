/** Default Normal-section row count on inbox home — shrinks when New + Important fill the view. */
export function inboxNormalSectionDefaultVisible(
	newCount: number,
	importantCount: number,
	sectionPageSize = 8
): number {
	const triage = Math.max(0, newCount) + Math.max(0, importantCount);
	if (triage === 0) return sectionPageSize;
	return Math.max(0, sectionPageSize - Math.ceil(triage / 2));
}

/**
 * Whether the Important inbox section should offer "Show more".
 * Uses displayable row count only — not raw mailbox total (which includes New+Important
 * rows that appear under New on inbox home).
 */
export function inboxImportantSectionCanShowMore(
	rowCount: number,
	visible: number,
	folderPreviewCount: number,
	fetchLimit: number,
	hasMoreFromServer: boolean
): boolean {
	if (rowCount > visible) return true;
	return (
		hasMoreFromServer &&
		folderPreviewCount >= fetchLimit &&
		rowCount >= visible
	);
}
