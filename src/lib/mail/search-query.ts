/** Parse mail search queries into JMAP Email/query filters. */

export type JmapEmailFilter = Record<string, unknown>;

const OPERATOR_PATTERN =
	/^(from|to|cc|subject|has|after|before):(?:"([^"]*)"|(\S+))$/i;

export function parseSearchQuery(input: string): { filter: JmapEmailFilter; terms: string[] } {
	const trimmed = input.trim();
	if (!trimmed) return { filter: { text: '' }, terms: [] };

	const tokens = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
	const filters: JmapEmailFilter[] = [];
	const textTerms: string[] = [];

	for (const raw of tokens) {
		const token = raw.replace(/^"(.+)"$/, '$1');
		const match = token.match(OPERATOR_PATTERN);
		if (!match) {
			textTerms.push(token);
			continue;
		}

		const key = match[1].toLowerCase();
		const value = (match[2] ?? match[3] ?? '').trim();
		if (!value && key !== 'has') {
			textTerms.push(token);
			continue;
		}

		switch (key) {
			case 'from':
				filters.push({ from: value });
				break;
			case 'to':
				filters.push({ to: value });
				break;
			case 'cc':
				filters.push({ cc: value });
				break;
			case 'subject':
				filters.push({ subject: value });
				break;
			case 'has':
				if (value.toLowerCase() === 'attachment') {
					filters.push({ hasAttachment: true });
				} else {
					textTerms.push(token);
				}
				break;
			case 'after':
				filters.push({ after: parseSearchDate(value, 'start') });
				break;
			case 'before':
				filters.push({ before: parseSearchDate(value, 'end') });
				break;
			default:
				textTerms.push(token);
		}
	}

	if (textTerms.length) {
		filters.push({ text: textTerms.join(' ') });
	}

	if (!filters.length) return { filter: { text: trimmed }, terms: textTerms };
	if (filters.length === 1) return { filter: filters[0], terms: textTerms };
	return { filter: { and: filters }, terms: textTerms };
}

function parseSearchDate(value: string, edge: 'start' | 'end'): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		if (edge === 'start') {
			return new Date(`${value}T00:00:00.000Z`).toISOString();
		}
		return new Date(`${value}T23:59:59.999Z`).toISOString();
	}
	return parsed.toISOString();
}

export function searchOperatorHint(): string {
	return 'from: · to: · subject: · has:attachment · after: · before:';
}
