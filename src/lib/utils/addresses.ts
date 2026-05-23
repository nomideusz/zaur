export function parseAddressList(input: string): string[] {
	return input
		.split(/[,;]/)
		.map((part) => part.trim())
		.filter(Boolean);
}
