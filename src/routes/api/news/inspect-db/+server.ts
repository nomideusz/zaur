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
    
    // Read newsStorePostgres.js to get PostgreSQL config
    let postgresConfig = '';
    try {
      const postgresConfigPath = path.join(libServerDir, 'newsStorePostgres.js');
      const postgresContent = fs.readFileSync(postgresConfigPath, 'utf8');
      const configMatch = postgresContent.match(/DB_CONFIG\s*=\s*{[\s\S]*?};/);
      postgresConfig = configMatch ? configMatch[0] : 'Config not found';
    } catch (error) {
      postgresConfig = `Error reading config: ${(error as Error).message}`;
    }
    
    // Get PostgreSQL environment variables
    const postgresEnvVars = {
      POSTGRES_HOST: process.env.POSTGRES_HOST || 'Not set',
      POSTGRES_PORT: process.env.POSTGRES_PORT || 'Not set',
      POSTGRES_DB: process.env.POSTGRES_DB || 'Not set',
      POSTGRES_USER: process.env.POSTGRES_USER || 'Not set',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? 'Set (hidden)' : 'Not set'
    };
    
    // Check data directory
    const dataPath = path.join(projectRoot, 'data');
    const dataFolderExists = fs.existsSync(dataPath);
    let dataFolderContent: string[] = [];
    
    if (dataFolderExists) {
      try {
        dataFolderContent = fs.readdirSync(dataPath);
      } catch (error) {
        dataFolderContent = [`Error reading data folder: ${(error as Error).message}`];
      }
    }
    
    return json({
      paths: {
        projectRoot,
        libServerDir
      },
      dataFolder: {
        path: dataPath,
        exists: dataFolderExists,
        content: dataFolderContent
      },
      postgresql: {
        config: postgresConfig,
        envVars: postgresEnvVars
      }
    });
  } catch (error) {
    console.error('Error in inspect-db endpoint:', error);
    return json({
      error: `Error inspecting database: ${(error as Error).message}`,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}; 