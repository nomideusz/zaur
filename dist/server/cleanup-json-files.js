import { promises as fs } from 'fs';
import path from 'path';
/**
 * Remove JSON files that are no longer needed since data is stored in RethinkDB
 */
async function removeJsonFiles() {
    try {
        const dataDir = path.join(process.cwd(), 'src', 'lib', 'server', 'data');
        // List of files to remove
        const filesToRemove = [
            'discoveries.json',
            'zaur_comments.json',
            'stored-news.json',
            'news.json'
        ];
        // Keep sample files for development/testing
        const filesToKeep = [
            'sample-news.json'
        ];
        console.log('Starting cleanup of JSON files...');
        // Get list of all files in the directory
        let existingFiles = [];
        try {
            existingFiles = await fs.readdir(dataDir);
            console.log(`Found ${existingFiles.length} files in data directory`);
        }
        catch (error) {
            console.error('Error reading data directory:', error);
            return;
        }
        // Remove each file
        for (const file of filesToRemove) {
            const filePath = path.join(dataDir, file);
            try {
                if (existingFiles.includes(file)) {
                    await fs.unlink(filePath);
                    console.log(`✅ Removed: ${file}`);
                }
                else {
                    console.log(`⚠️ File not found: ${file}`);
                }
            }
            catch (error) {
                console.error(`Error removing ${file}:`, error);
            }
        }
        // Create backup directory
        const backupDir = path.join(dataDir, 'backup');
        try {
            await fs.mkdir(backupDir, { recursive: true });
            console.log('Created backup directory');
        }
        catch (error) {
            console.error('Error creating backup directory:', error);
        }
        // Create a README to explain the migration
        const readmePath = path.join(dataDir, 'README.md');
        const readmeContent = `# Data Directory

This directory previously contained JSON files for data storage. 
All data has been migrated to RethinkDB. The JSON files have been removed.

The \`sample-news.json\` file is kept for development/testing purposes.

## Migration Date
${new Date().toISOString()}
`;
        try {
            await fs.writeFile(readmePath, readmeContent);
            console.log('✅ Created README.md');
        }
        catch (error) {
            console.error('Error creating README:', error);
        }
        console.log('\nCleanup complete!');
    }
    catch (error) {
        console.error('Error during cleanup:', error);
    }
}
// Run the cleanup
removeJsonFiles();
