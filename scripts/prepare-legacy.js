
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

console.log('🔄 Preparing Legacy Dist (Renaming HTML)...');

const src = path.join(distDir, 'index-legacy.html');
const dest = path.join(distDir, 'index.html');

if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log('✅ Renamed index-legacy.html -> index.html');
} else if (fs.existsSync(dest)) {
    console.log('ℹ️ index.html already exists. Skipping rename.');
} else {
    console.error('❌ Error: index-legacy.html not found in dist/');
    process.exit(1);
}
