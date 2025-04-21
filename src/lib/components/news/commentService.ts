import { hashString } from './utils.js';
import { keywordResponses, categoryCommentary, categorySpecificComments } from './commentaryData.js';

// Generate a unique comment for specific article based on its title and category
export function generateSpecificComment(title: string, category: string): string {
  const titleLower = title.toLowerCase();
  
  // Check if any keywords match the title - prioritize this
  for (const [keyword, responses] of Object.entries(keywordResponses)) {
    const keywordLower = keyword.toLowerCase();
    if (titleLower.includes(keywordLower)) {
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
  
  // First, try to get a specific comment based on keywords in the title
  const specificDetails = generateSpecificComment(title, category);
  if (specificDetails) {
    // If we have a specific detail comment, use it without appending category commentary
    if (!usedComments.has(specificDetails)) {
      usedComments.add(specificDetails);
      return specificDetails;
    }
  }
  
  // If no specific keyword match or it was used, fall back to category commentary
  const commentOptions = categoryCommentary[category] || [];
  if (commentOptions.length > 0) {
    // Generate a unique seed based on title + category to get more variety
    const titleHash = hashString(title + category);
    
    // Try to find a comment that hasn't been used yet
    let attempts = 0;
    let selectedComment = '';
    
    while (attempts < commentOptions.length) {
      const commentIndex = (titleHash + attempts) % commentOptions.length;
      const candidateComment = commentOptions[commentIndex];
      
      if (!usedComments.has(candidateComment)) {
        selectedComment = candidateComment;
        break;
      }
      
      attempts++;
    }
    
    // If we couldn't find an unused comment, just use the first one
    if (!selectedComment) {
      selectedComment = commentOptions[titleHash % commentOptions.length];
    }
    
    // Mark this comment as used
    usedComments.add(selectedComment);
    
    return selectedComment;
  }
  
  // If nothing else, return null (no comment)
  return null;
} 