import { hashString } from './utils.js';
import { keywordResponses, categoryCommentary, categorySpecificComments } from './commentaryData.js';

// Generate a unique comment for specific article based on its title and category
export function generateSpecificComment(title: string, category: string): string {
  // Check if any keywords match the title
  for (const [keyword, responses] of Object.entries(keywordResponses)) {
    if (title.includes(keyword) || title.includes(keyword.toLowerCase())) {
      const titleHash = hashString(title);
      const responseIndex = titleHash % responses.length;
      return responses[responseIndex];
    }
  }
  
  // Category-specific comments if no keyword matches
  if (categorySpecificComments[category]) {
    const titleHash = hashString(title);
    const options = categorySpecificComments[category];
    const index = titleHash % options.length;
    return options[index];
  }
  
  return '';
}

/**
 * Generate a comment for a news item
 * @param title News item title
 * @param category News item category
 * @param baseComment Optional base comment to use
 * @param usedComments Set of comments that have already been used (to avoid duplicates)
 * @returns A comment for the news item
 */
export function generateComment(
  title: string, 
  category: string, 
  baseComment?: string | null,
  usedComments: Set<string> = new Set<string>()
): string | null {
  // If we already have a saved comment, return it
  if (baseComment) {
    return baseComment;
  }
  
  const commentOptions = categoryCommentary[category] || [];
  if (commentOptions.length > 0) {
    // Use the title to deterministically select a comment
    const titleHash = hashString(title);
    const commentIndex = titleHash % commentOptions.length;
    const baseComment = commentOptions[commentIndex];
    
    // Add article-specific details to make the comment unique
    const specificDetails = generateSpecificComment(title, category);
    
    if (specificDetails && !usedComments.has(baseComment)) {
      return `${baseComment} ${specificDetails}`;
    } else {
      return baseComment;
    }
  }
  
  return null;
} 