export declare function generateSpecificComment(title: string, category: string): string;
/**
 * Generate a comment for a news item
 * @param title News item title
 * @param category News item category
 * @param baseComment Optional base comment to use
 * @param usedComments Set of comments that have already been used (to avoid duplicates)
 * @returns A comment for the news item
 */
export declare function generateComment(title: string, category: string, baseComment?: string | null, usedComments?: Set<string>): string | null;
