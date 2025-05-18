import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getActiveStoreType, getComments } from '$lib/server/newsStoreInit.js';
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
    
    // Get the active store type
    const activeStore = getActiveStoreType();
    
    // Check if comments are supported
    let commentsSupported = false;
    let commentsTestResult = null;
    
    try {
      // Try to fetch comments for a test ID
      const comments = await getComments('test-id');
      commentsSupported = Array.isArray(comments);
      commentsTestResult = {
        success: commentsSupported,
        count: comments.length
      };
    } catch (error) {
      commentsTestResult = {
        success: false,
        error: (error as Error).message
      };
    }
    
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
      },
      activeStore,
      storeDescription: activeStore === 'postgres' ? 'PostgreSQL database' : 'In-memory mock store',
      timestamp: new Date().toISOString(),
      comments: {
        supported: commentsSupported,
        testResult: commentsTestResult
      }
    });
  } catch (error: any) {
    console.error('Error in store-status endpoint:', error);
    return json({
      error: `Error getting store status: ${(error as Error).message}`,
      stack: (error as Error).stack
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