import { json } from '@sveltejs/kit';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the discoveries data file (using $lib/server/data for proper location)
const dataFilePath = path.join(__dirname, '../../../lib/server/data/discoveries.json');
const commentsFilePath = path.join(__dirname, '../../../lib/server/data/zaur_comments.json');

// Data structure for Zaur's comments
interface ZaurComment {
  itemId: string;
  comment: string;
  timestamp: string;
}

// Ensure the data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(dataFilePath);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Get all discovered items
async function getDiscoveredItems() {
  await ensureDataDirectory();
  
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, return empty array
    return [];
  }
}

// Save discovered items
async function saveDiscoveredItems(items: string[]) {
  await ensureDataDirectory();
  await fs.writeFile(dataFilePath, JSON.stringify(items, null, 2), 'utf-8');
}

// Get all Zaur's comments
async function getZaurComments(): Promise<ZaurComment[]> {
  await ensureDataDirectory();
  
  try {
    const data = await fs.readFile(commentsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, return empty array
    return [];
  }
}

// Save Zaur's comments
async function saveZaurComments(comments: ZaurComment[]) {
  await ensureDataDirectory();
  console.log(`Saving ${comments.length} Zaur comments to ${commentsFilePath}`);
  await fs.writeFile(commentsFilePath, JSON.stringify(comments, null, 2), 'utf-8');
  
  // Verify file was created
  try {
    await fs.access(commentsFilePath);
    console.log(`Verified: Comments file exists at ${commentsFilePath}`);
  } catch (error) {
    console.error(`ERROR: Failed to create comments file at ${commentsFilePath}`, error);
  }
}

// GET handler - retrieve all discovered items
export async function GET({ url }) {
  const includeComments = url.searchParams.get('includeComments') === 'true';
  
  const items = await getDiscoveredItems();
  
  if (includeComments) {
    const comments = await getZaurComments();
    return json({ items, comments });
  }
  
  return json({ items });
}

// POST handler - add a new discovered item
export async function POST({ request }) {
  const reqData = await request.json();
  const { id, comment } = reqData;
  
  if (!id) {
    return json({ error: 'Item ID is required' }, { status: 400 });
  }
  
  // Handle discovered items
  const items = await getDiscoveredItems();
  let isNewDiscovery = false;
  
  // Only add if not already in the list
  if (!items.includes(id)) {
    items.push(id);
    await saveDiscoveredItems(items);
    isNewDiscovery = true;
  }
  
  // Handle comments if provided
  if (comment) {
    const comments = await getZaurComments();
    const existingComment = comments.find(c => c.itemId === id);
    
    if (existingComment) {
      // Update existing comment
      existingComment.comment = comment;
      existingComment.timestamp = new Date().toISOString();
    } else {
      // Add new comment
      comments.push({
        itemId: id,
        comment,
        timestamp: new Date().toISOString()
      });
    }
    
    await saveZaurComments(comments);
  }
  
  return json({ 
    success: true, 
    items,
    isNewDiscovery
  });
} 