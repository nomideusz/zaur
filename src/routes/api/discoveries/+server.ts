import { json } from '@sveltejs/kit';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the discoveries data file (using parent directory for proper location)
const dataFilePath = path.join(__dirname, '../../../../data/discoveries.json');

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

// GET handler - retrieve all discovered items
export async function GET() {
  const items = await getDiscoveredItems();
  return json({ items });
}

// POST handler - add a new discovered item
export async function POST({ request }) {
  const { id } = await request.json();
  
  if (!id) {
    return json({ error: 'Item ID is required' }, { status: 400 });
  }
  
  const items = await getDiscoveredItems();
  
  // Only add if not already in the list
  if (!items.includes(id)) {
    items.push(id);
    await saveDiscoveredItems(items);
  }
  
  return json({ success: true, items });
} 