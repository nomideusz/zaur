import { errorMessage } from '@zaur/mail-core/utils/errors';
import { parseSearchQuery } from '@zaur/mail-core/mail/search-query';
import type { JMAPClient } from '$lib/jmap/client';
import { browser } from '$app/environment';
import { mapEmailPreview, resolveRouteMailboxId } from '$lib/jmap/map';
import { isAccountSettingsSubject } from '$lib/settings/account-settings-types';
import type { JMAPEmail } from '$lib/jmap/types';
import type { Mailbox, MessagePreview } from '$lib/types/mail';
import { recordMessages } from '$lib/utils/contact-index';

const PAGE_SIZE = 50;

/**
 * Substring hits from the local preview cache. Stalwart's FTS only matches
 * whole tokens ("rail" misses "Railway"); the cache fills the prefix/partial
 * gap for recent mail. Pure-text queries only — operator filters (from:, is:…)
 * can't be evaluated locally.
 */
async function localSubstringResults(
	query: string,
	mailboxes: Mailbox[],
	mailboxJmapId: string | null
): Promise<MessagePreview[]> {
	if (!browser || /(^|\s)(from|to|cc|subject|has|after|before|is):/i.test(query)) return [];
	const { terms } = parseSearchQuery(query);
	if (!terms.length) return [];

	try {
		const { getAccountId, searchCachedMessagePreviews } = await import('$lib/db');
		const accountId = getAccountId();
		if (!accountId) return [];
		const mailboxRouteId = mailboxJmapId
			? mailboxes.find((mb) => mb.jmapId === mailboxJmapId)?.id
			: undefined;
		const hits = await searchCachedMessagePreviews(accountId, terms, { mailboxRouteId });
		return hits.filter((hit) => !isAccountSettingsSubject(hit.subject));
	} catch {
		return [];
	}
}

function mergeByReceivedAt(server: MessagePreview[], extras: MessagePreview[]): MessagePreview[] {
	if (!extras.length) return server;
	return [...server, ...extras].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
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
	results = $state<MessagePreview[]>([]);
	/** Server rows fetched so far — the Email/query offset (local extras excluded). */
	#serverCount = 0;
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

		this.loading = true;
		this.error = null;

		try {
			const [{ emails, total, hasMore }, local] = await Promise.all([
				client.searchEmails(trimmed, PAGE_SIZE, 0, mailboxId ?? undefined),
				localSubstringResults(trimmed, mailboxes, mailboxId)
			]);
			const server = mapVisibleSearchPreviews(emails, mailboxes);
			const seen = new Set(server.map((preview) => preview.id));
			const extras = local.filter((preview) => !seen.has(preview.id));
			this.#serverCount = emails.length;
			this.results = mergeByReceivedAt(server, extras);
			this.total = total + extras.length;
			this.hasMore = hasMore;
			indexSearchContacts(this.results);
		} catch (error) {
			this.results = [];
			this.total = 0;
			this.hasMore = false;
			this.error = errorMessage(error, 'Search failed');
		} finally {
			this.loading = false;
		}
	}

	async loadMore(client: JMAPClient, mailboxes: Mailbox[]) {
		if (!this.query || !this.hasMore || this.loadingMore) return;

		this.loadingMore = true;
		try {
			const { emails, hasMore } = await client.searchEmails(
				this.query,
				PAGE_SIZE,
				this.#serverCount,
				this.mailboxId ?? undefined
			);
			this.#serverCount += emails.length;
			const seen = new Set(this.results.map((preview) => preview.id));
			const previews = mapVisibleSearchPreviews(emails, mailboxes).filter(
				(preview) => !seen.has(preview.id)
			);
			this.results = [...this.results, ...previews];
			this.hasMore = hasMore;
			indexSearchContacts(previews);
		} catch (error) {
			this.error = errorMessage(error, 'Failed to load more results');
		} finally {
			this.loadingMore = false;
		}
	}

	reset() {
		this.query = '';
		this.mailboxId = null;
		this.results = [];
		this.#serverCount = 0;
		this.loading = false;
		this.loadingMore = false;
		this.error = null;
		this.total = 0;
		this.hasMore = false;
	}
}

export const search = new SearchStore();
