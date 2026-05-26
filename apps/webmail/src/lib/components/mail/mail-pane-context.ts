export const MAIL_PANE_CTX = Symbol('mail-pane');

export type MailPaneContext = {
	showImagesOnce: boolean;
	setShowImagesOnce: (value: boolean) => void;
};
