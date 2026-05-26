export function parseAddressList(input: string): string[] {
	return input
		.split(/[,;]/)
		.map((part) => part.trim())
		.filter(Boolean);
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
