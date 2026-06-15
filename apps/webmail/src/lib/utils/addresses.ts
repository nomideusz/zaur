export function parseAddressList(input: string): string[] {
	return parseAddressEntries(input)
		.filter((entry) => entry.valid)
		.map((entry) => entry.email);
}

export function formatAddressList(addrs: { name?: string; email: string }[]): string {
	return addrs
		.map((addr) => {
			const email = addr.email.trim();
			if (!email) return '';
			const name = addr.name?.trim();
			if (name && name.toLowerCase() !== email.toLowerCase()) {
				return `${name} <${email}>`;
			}
			return email;
		})
		.filter(Boolean)
		.join(', ');
}

export function invalidAddressParts(input: string): string[] {
	return parseAddressEntries(input)
		.filter((entry) => !entry.valid)
		.map((entry) => entry.raw);
}

/** Whether a single raw recipient part (e.g. `a@b.com` or `Name <a@b.com>`) is a valid address. */
export function isAddressValid(raw: string): boolean {
	return isValidEmail(extractEmail(raw));
}

function parseAddressEntries(input: string): Array<{ raw: string; email: string; valid: boolean }> {
	return splitAddressList(input)
		.map((raw) => {
			const email = extractEmail(raw);
			return { raw, email, valid: isValidEmail(email) };
		})
		.filter((entry) => entry.raw || entry.email);
}

/** Split a recipient string into raw parts on `,`/`;`, keeping invalid parts and respecting quotes/angle brackets. */
export function splitAddressList(input: string): string[] {
	const parts: string[] = [];
	let current = '';
	let inQuotes = false;
	let angleDepth = 0;

	for (const char of input) {
		if (char === '"') inQuotes = !inQuotes;
		if (!inQuotes) {
			if (char === '<') angleDepth += 1;
			if (char === '>' && angleDepth > 0) angleDepth -= 1;
			if ((char === ',' || char === ';') && angleDepth === 0) {
				const part = current.trim();
				if (part) parts.push(part);
				current = '';
				continue;
			}
		}
		current += char;
	}

	const tail = current.trim();
	if (tail) parts.push(tail);
	return parts;
}

function extractEmail(raw: string): string {
	const angleMatch = raw.match(/<([^<>]+)>/);
	const value = angleMatch?.[1] ?? raw;
	return value.trim().replace(/^mailto:/i, '');
}

function isValidEmail(email: string): boolean {
	return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}
