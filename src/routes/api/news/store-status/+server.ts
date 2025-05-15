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
    
    // Check for SQLite binary existence
    let sqliteBindingPath = null;
    let sqliteBindingExists = false;
    
    try {
      // Try to resolve the binding path
      const bindings = await import('bindings');
      try {
        sqliteBindingPath = bindings.default('better_sqlite3.node');
        sqliteBindingExists = fs.existsSync(sqliteBindingPath);
      } catch (bindingError) {
        sqliteBindingPath = bindingError.message || 'Error resolving binding path';
        sqliteBindingExists = false;
      }
    } catch (importError) {
      sqliteBindingPath = 'Error importing bindings module';
      sqliteBindingExists = false;
    }
    
    return json({
      storeType: getActiveStoreType(),
      dbFile: {
        path: dbPath,
        exists: fs.existsSync(dbPath)
      },
      dataDir: {
        path: dataDir,
        exists: fs.existsSync(dataDir),
        writable: await isDirectoryWritable(dataDir)
      },
      sqliteBinding: {
        path: sqliteBindingPath,
        exists: sqliteBindingExists
      },
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch
      }
    });
  } catch (error) {
    return json({
      error: `Error checking store status: ${error.message}`,
      storeType: getActiveStoreType()
    }, { status: 500 });
  }
};

/**
 * Check if a directory is writable
 */
async function isDirectoryWritable(directory) {
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