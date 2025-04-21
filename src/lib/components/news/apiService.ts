/**
 * Load previously discovered items from server
 * @returns Object containing discovered items, item data with timestamps, and comments
 */
export async function loadDiscoveredItems(): Promise<{
  items: string[];
  itemsData: { itemId: string; timestamp: string }[];
  comments: { itemId: string; comment: string }[];
}> {
  try {
    const response = await fetch('/api/discoveries?includeComments=true&includeTimestamps=true');
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      items: Array.isArray(data.items) ? data.items : [],
      itemsData: Array.isArray(data.itemsData) ? data.itemsData : [],
      comments: Array.isArray(data.comments) ? data.comments : []
    };
  } catch (err) {
    console.error('Error loading discovered items from server:', err);
    return { items: [], itemsData: [], comments: [] };
  }
}

/**
 * Save a newly discovered item to the server
 * @param id Item ID
 * @param comment Optional comment
 */
export async function saveDiscoveredItem(id: string, comment?: string): Promise<boolean> {
  try {
    const payload: any = { itemId: id };
    if (comment) {
      payload.comment = comment;
    }
    
    const response = await fetch('/api/discoveries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    console.log(`[ZaurNews] Saved discovered item to server: ${id}`);
    return true;
  } catch (err) {
    console.error('Error saving discovered item to server:', err);
    return false;
  }
}

/**
 * Save Zaur's comment for an item
 * @param id Item ID
 * @param comment The comment text
 */
export async function saveZaurComment(id: string, comment: string): Promise<boolean> {
  try {
    // POST to comments endpoint
    const response = await fetch('/api/discoveries/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId: id, comment })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    console.log(`[ZaurNews] Saved comment for item: ${id}`);
    return true;
  } catch (err) {
    console.error('Error saving Zaur comment:', err);
    return false;
  }
} 