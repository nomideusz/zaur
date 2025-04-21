#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
  'init-db.js',
  'populate-db.js'
];

async function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n======= Running ${scriptName} =======\n`);
    
    const scriptPath = path.join(__dirname, scriptName);
    const process = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Script ${scriptName} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function setup() {
  console.log('Starting Zaur system setup...');
  
  try {
    // Run each script in sequence
    for (const script of scripts) {
      await runScript(script);
    }
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run news updates with: node scripts/update-news.js');
    console.log('2. Schedule automatic updates with: node scripts/schedule-news-updates.js');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setup(); 