import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
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
    const libServerDir = path.join(projectRoot, 'src/lib/server');
    const expectedDbPath = path.join(projectRoot, 'data', 'zaur_news.db');
    
    // Find all .db files
    let dbFiles = [];
    
    // Check for .db files in the project root and subdirectories
    const findDbFiles = (dir, maxDepth = 3, currentDepth = 0) => {
      if (currentDepth > maxDepth) return;
      
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          
          if (fs.statSync(fullPath).isDirectory() && 
              !fullPath.includes('node_modules') && 
              !file.startsWith('.')) {
            findDbFiles(fullPath, maxDepth, currentDepth + 1);
          } else if (file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3')) {
            dbFiles.push(fullPath);
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
    };
    
    findDbFiles(projectRoot);
    
    // Check if better-sqlite3 is installed
    let sqliteInstalled = false;
    try {
      require.resolve('better-sqlite3');
      sqliteInstalled = true;
    } catch (error) {
      sqliteInstalled = false;
    }
    
    // Read newsStoreSqlite.js to get DB_CONFIG
    let sqliteConfig = '';
    try {
      const sqliteConfigPath = path.join(libServerDir, 'newsStoreSqlite.js');
      const sqliteContent = fs.readFileSync(sqliteConfigPath, 'utf8');
      const configMatch = sqliteContent.match(/DB_CONFIG\s*=\s*{[\s\S]*?};/);
      sqliteConfig = configMatch ? configMatch[0] : 'Config not found';
    } catch (error) {
      sqliteConfig = `Error reading config: ${error.message}`;
    }
    
    // Check data directory
    const dataPath = path.join(projectRoot, 'data');
    const dataFolderExists = fs.existsSync(dataPath);
    let dataFolderContent = [];
    
    if (dataFolderExists) {
      try {
        dataFolderContent = fs.readdirSync(dataPath);
      } catch (error) {
        dataFolderContent = [`Error reading data folder: ${error.message}`];
      }
    }
    
    return json({
      paths: {
        projectRoot,
        libServerDir,
        expectedDbPath,
        expectedDbExists: fs.existsSync(expectedDbPath)
      },
      dataFolder: {
        path: dataPath,
        exists: dataFolderExists,
        content: dataFolderContent
      },
      foundDbFiles: dbFiles,
      sqliteInstalled,
      sqliteConfig
    });
  } catch (error) {
    console.error('Error in inspect-db endpoint:', error);
    return json({
      error: `Error inspecting database: ${error.message}`,
      stack: error.stack
    }, { status: 500 });
  }
}; 