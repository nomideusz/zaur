#!/usr/bin/env node

import { scheduleJob } from 'node-schedule';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the update script
const updateScriptPath = path.join(__dirname, 'update-news.js');

function runUpdateScript() {
  console.log(`Running news update at ${new Date().toISOString()}`);
  
  const updateProcess = spawn('npx', ['tsx', updateScriptPath], {
    stdio: 'inherit',
    shell: true
  });
  
  updateProcess.on('close', code => {
    if (code !== 0) {
      console.error(`News update process exited with code ${code}`);
    } else {
      console.log('News update completed successfully');
    }
  });
}

function setupSchedule() {
  console.log('Setting up news update schedule...');
  
  // Schedule updates to run every 3 hours
  // Format: '0 */3 * * *' (at minute 0, every 3 hours, every day)
  const job = scheduleJob('0 */3 * * *', runUpdateScript);
  
  console.log('News updates scheduled to run every 3 hours');
  console.log('Press Ctrl+C to terminate the scheduler');
  
  // Run once immediately
  console.log('Running initial update...');
  runUpdateScript();
}

setupSchedule(); 