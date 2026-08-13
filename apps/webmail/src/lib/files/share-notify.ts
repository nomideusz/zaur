import type { FileShareRole } from '@zaur/mail-core/types/files';

export function shareNotifySubject(itemName: string, sharerName: string): string {
	return `${sharerName} shared “${itemName}” with you`;
}

export function shareNotifyBody(options: {
	itemName: string;
	itemKind: 'file' | 'folder';
	sharerName: string;
	role: FileShareRole;
	filesUrl: string;
}): string {
	const access = options.role === 'write' ? 'edit' : 'view';
	return [
		`${options.sharerName} shared the ${options.itemKind} “${options.itemName}” with you (${access} access).`,
		'',
		`Open it in Files: ${options.filesUrl}`
	].join('\n');
}
