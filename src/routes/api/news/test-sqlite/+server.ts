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
    const projectRoot = path.resolve(__dirname, '../../../../../');
    const dataPath = path.join(projectRoot, 'data');
    const dbPath = path.join(dataPath, 'test.db');
    
    // Ensure data directory exists
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    let results = {
      projectRoot,
      dataPath,
      dataPathExists: fs.existsSync(dataPath),
      dbPath,
      steps: []
    };
    
    // Try to dynamically import better-sqlite3
    try {
      results.steps.push('Attempting to import better-sqlite3');
      const sqlite3Module = await import('better-sqlite3');
      const Database = sqlite3Module.default;
      results.steps.push('Successfully imported better-sqlite3');
      
      // Try to create a database
      results.steps.push('Attempting to create database');
      const db = new Database(dbPath);
      results.steps.push('Successfully created database connection');
      
      // Create a table
      results.steps.push('Attempting to create a table');
      db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
      results.steps.push('Successfully created table');
      
      // Insert data
      results.steps.push('Attempting to insert data');
      const insert = db.prepare('INSERT INTO test (name) VALUES (?)');
      insert.run('Test ' + new Date().toISOString());
      results.steps.push('Successfully inserted data');
      
      // Query data
      results.steps.push('Attempting to query data');
      const rows = db.prepare('SELECT * FROM test ORDER BY id DESC LIMIT 5').all();
      results.steps.push('Successfully queried data');
      results.rows = rows;
      
      // Close connection
      db.close();
      results.steps.push('Closed database connection');
      
      // Check if file was created
      results.fileExists = fs.existsSync(dbPath);
      if (results.fileExists) {
        const stats = fs.statSync(dbPath);
        results.fileSize = stats.size;
        results.fileCreated = stats.birthtime;
        results.fileModified = stats.mtime;
      }
      
    } catch (error) {
      results.steps.push(`Error: ${error.message}`);
      results.error = error.message;
      results.stack = error.stack;
    }
    
    return json(results);
  } catch (error) {
    return json({
      error: `Error in test-sqlite endpoint: ${error.message}`,
      stack: error.stack
    }, { status: 500 });
  }
}; 