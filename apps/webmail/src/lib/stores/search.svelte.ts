import type { JMAPClient } from '$lib/jmap/client';
import { browser } from '$app/environment';
import { mapEmailPreview, resolveRouteMailboxId } from '$lib/jmap/map';
import { isAccountSettingsSubject } from '$lib/settings/account-settings-types';
import type { JMAPEmail } from '$lib/jmap/types';
import type { Mailbox, MessagePreview } from '$lib/types/mail';
import { listContacts, recordMessages } from '$lib/utils/contact-index';
import { parseSearchQuery } from '$lib/mail/search-query';

const PAGE_SIZE = 50;

/**
 * Stalwart's full-text index is token-based, so a partial name ("Bart") never
 * matches a fuller one ("Bartek"). Resolve the free-text terms against the local
 * contact index and return the matching correspondents' addresses so the query
 * can also match mail from/to them.
 */
function resolveNameAddresses(accountId: string | null, query: string): string[] {
	if (!browser || !accountId) return [];
	const { terms } = parseSearchQuery(query);
	if (!terms.length) return [];
	const matches = listContacts(accountId, terms.join(' ')).slice(0, 8);
	return [...new Set(matches.map((contact) => contact.email))];
}

function mapVisibleSearchPreviews(emails: JMAPEmail[], mailboxes: Mailbox[]): MessagePreview[] {
	return emails
		.filter((email) => !isAccountSettingsSubject(email.subject))
		.map((email) => mapEmailPreview(email, resolveRouteMailboxId(email, mailboxes)));
}

function indexSearchContacts(previews: MessagePreview[]) {
	if (!browser || !previews.length) return;

	void import('$lib/db').then(({ getAccountId }) => {
		const accountId = getAccountId();
		if (!accountId) return;
		recordMessages(accountId, previews);
	});
}

class SearchStore {
	query = $state('');
	mailboxId = $state<string | null>(null);
	nameAddresses: string[] = [];
	results = $state<MessagePreview[]>([]);
	loading = $state(false);
	loadingMore = $state(false);
	error = $state<string | null>(null);
	total = $state(0);
	hasMore = $state(false);

	async search(
		client: JMAPClient,
		query: string,
		mailboxes: Mailbox[],
		mailboxId: string | null = null
	) {
		const trimmed = query.trim();
		this.query = trimmed;
		this.mailboxId = mailboxId;

		if (!trimmed) {
			this.results = [];
			this.total = 0;
			this.hasMore = false;
			this.error = null;
			return;
		}

		this.nameAddresses = resolveNameAddresses(client.getAccountId(), trimmed);

		this.loading = true;
		this.error = null;

		try {
			const { emails, total, hasMore } = await client.searchEmails(
				trimmed,
				PAGE_SIZE,
				0,
				mailboxId ?? undefined,
				this.nameAddresses
			);
			this.results = mapVisibleSearchPreviews(emails, mailboxes);
			this.total = total;
			this.hasMore = hasMore;
			indexSearchContacts(this.results);
		} catch (error) {
			this.results = [];
			this.total = 0;
			this.hasMore = false;
			this.error = error instanceof Error ? error.message : 'Search failed';
		} finally {
			this.loading = false;
		}
	}

	async loadMore(client: JMAPClient, mailboxes: Mailbox[]) {
		if (!this.query || !this.hasMore || this.loadingMore) return;

		this.loadingMore = true;
		try {
			const position = this.results.length;
			const { emails, hasMore } = await client.searchEmails(
				this.query,
				PAGE_SIZE,
				position,
				this.mailboxId ?? undefined,
				this.nameAddresses
			);
			const previews = mapVisibleSearchPreviews(emails, mailboxes);
			this.results = [...this.results, ...previews];
			this.hasMore = hasMore;
			indexSearchContacts(previews);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load more results';
		} finally {
			this.loadingMore = false;
		}
	}

	reset() {
		this.query = '';
		this.mailboxId = null;
		this.nameAddresses = [];
		this.results = [];
		this.loading = false;
		this.loadingMore = false;
		this.error = null;
		this.total = 0;
		this.hasMore = false;
	}
}

export const search = new SearchStore();
