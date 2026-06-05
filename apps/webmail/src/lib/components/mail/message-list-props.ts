import type { MessagePreview } from '$lib/types/mail';

export type MessageListReadFilter = 'all' | 'unread' | 'read';

export type MessageListProps = {
	messages: MessagePreview[];
	mailboxName: string;
	mailboxRouteId?: string;
	loading?: boolean;
	loadingMore?: boolean;
	hasMore?: boolean;
	error?: string | null;
	total?: number;
	emptyMessage?: string;
	emptyHint?: string;
	emptyIcon?: 'inbox' | 'search' | 'none';
	emptyActionHref?: string;
	emptyActionLabel?: string;
	hideOnMobile?: boolean;
	onLoadMore?: () => void;
	onRetry?: () => void;
	onBulkAction?: () => void;
};
