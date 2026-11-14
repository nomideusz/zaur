/** What a view's `bot` column holds: why server/bots.ts took it for a program. Null is a person. */
export type BotReason = 'utc' | 'cloud' | 'proxy' | 'headless';

export const BOT_REASONS: Record<BotReason, string> = {
	utc: 'clock on UTC, as a server’s is',
	cloud: 'a data centre, its clock far away',
	proxy: 'clock from another country, and never stayed',
	headless: 'a headless browser’s screen'
};

export const botReasonText = (why: string) => BOT_REASONS[why as BotReason] ?? why;
