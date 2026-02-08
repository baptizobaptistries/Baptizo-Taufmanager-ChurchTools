import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (fs.existsSync(distDir)) {
    try {
        fs.rmSync(distDir, { recursive: true, force: true });
        console.log('✓ Cleaned dist directory');
    } catch (error) {
        console.error('❌ Failed to clean dist directory:', error);
        process.exit(1);
    }
} else {
    console.log('ℹ dist directory does not exist, skipping clean');
}
