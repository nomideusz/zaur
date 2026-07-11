export const LABEL_UNSEEN = 'Unseen';
export const LABEL_SEEN = 'Seen';
/** Clears Unseen — sets $seen / unread=false. */
export const LABEL_MARK_SEEN = 'Mark seen';
/** Restores Unseen — removes $seen / unread=true. */
export const LABEL_UNSEE = 'Unsee';

/** @deprecated Use {@link LABEL_MARK_SEEN}. */
export const LABEL_CLEAR_NEW = LABEL_MARK_SEEN;
/** @deprecated Use {@link LABEL_UNSEE}. */
export const LABEL_RESTORE_NEW = LABEL_UNSEE;

/** Pin for follow-up — clears Unseen when the message is still unseen. */
export const LABEL_MARK_IMPORTANT = 'Highlight';

/** File as normal — clears Unseen, or removes the Highlight pin. */
export const LABEL_NOT_IMPORTANT = 'Not highlighted';

export const LABEL_REMOVE_IMPORTANT = 'Remove highlight';
