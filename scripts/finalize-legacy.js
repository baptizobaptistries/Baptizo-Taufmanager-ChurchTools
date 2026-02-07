
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const legacyIndex = path.join(distDir, 'index-legacy.html');
const targetIndex = path.join(distDir, 'index.html');

console.log('🔄 Finalizing Legacy Build...');

if (!fs.existsSync(legacyIndex)) {
    console.error('❌ Error: dist/index-legacy.html not found!');
    process.exit(1);
}

// Retry loop for Windows file locking issues
let retries = 5;
while (retries > 0) {
    try {
        if (fs.existsSync(targetIndex)) {
            fs.unlinkSync(targetIndex);
        }
        fs.renameSync(legacyIndex, targetIndex);
        console.log('✅ Renamed index-legacy.html to index.html');
        break;
    } catch (error) {
        retries--;
        console.warn(`⚠️ Rename failed (File locked?), retrying... (${retries} left)`);
        execSync('timeout /t 1', { stdio: 'ignore' }); // Wait 1 sec
        if (retries === 0) {
            console.error('❌ Failed to rename file:', error);
            process.exit(1);
        }
    }
}

// Trigger package script
console.log('📦 Triggering package script...');
try {
    execSync('node scripts/package.js legacy', { stdio: 'inherit', cwd: rootDir });
} catch (error) {
    console.error('❌ Packaging failed');
    process.exit(1);
}
