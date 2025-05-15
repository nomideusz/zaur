import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getActiveStoreType } from '$lib/server/newsStoreInit.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const GET: RequestHandler = async () => {
  try {
    // Get current directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Calculate paths
    const projectRoot = path.resolve(__dirname, '../../../../../');
    const dataDir = path.join(projectRoot, 'data');
    const dbPath = path.join(dataDir, 'zaur_news.db');
    
    // Check for SQLite db existence instead of bindings
    const sqliteStatus = {
      dbExists: fs.existsSync(dbPath),
      activeStore: getActiveStoreType(),
      size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
    };
    
    return json({
      storeType: getActiveStoreType(),
      dbFile: {
        path: dbPath,
        exists: fs.existsSync(dbPath),
        size: sqliteStatus.size
      },
      dataDir: {
        path: dataDir,
        exists: fs.existsSync(dataDir),
        writable: await isDirectoryWritable(dataDir)
      },
      sqliteStatus,
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch
      }
    });
  } catch (error: any) {
    return json({
      error: `Error checking store status: ${error.message}`,
      storeType: getActiveStoreType()
    }, { status: 500 });
  }
};

/**
 * Check if a directory is writable
 */
async function isDirectoryWritable(directory: string): Promise<boolean> {
  try {
    if (!fs.existsSync(directory)) {
      return false;
    }
    
    const testFile = path.join(directory, '.write_test_' + Date.now());
    await fs.promises.writeFile(testFile, 'test');
    await fs.promises.unlink(testFile);
    return true;
  } catch (error) {
    return false;
  }
} 