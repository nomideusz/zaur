export type RootStackParamList = {
	Inbox: undefined;
	Thread: { threadId: string; subject: string };
	Message: { messageId: string; subject: string };
	Compose: { to?: string; subject?: string; quotedText?: string };
};
