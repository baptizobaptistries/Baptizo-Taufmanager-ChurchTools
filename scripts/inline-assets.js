import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const legacyHtmlPath = path.resolve(distDir, 'index-legacy.html');
const finalHtmlPath = path.resolve(distDir, 'index.html');

console.log('🔄 Starting asset inlining process...');

if (!fs.existsSync(legacyHtmlPath)) {
    console.error('❌ Error: index-legacy.html not found in dist:', legacyHtmlPath);
    process.exit(1);
}

console.log('📄 Found legacy HTML, processing...');
let html = fs.readFileSync(legacyHtmlPath, 'utf-8');

// Find JS and CSS files in assets
const assetsDir = path.resolve(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
    console.log('📂 Assets directory found, scanning...');
    const files = fs.readdirSync(assetsDir);

    files.forEach(file => {
        const filePath = path.join(assetsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (file.endsWith('.js')) {
            console.log(`   📦 Inlining JS: ${file}`);
            // Replace script tag
            // Looking for src="./assets/filename" or src="/assets/filename"
            const scriptRegex = new RegExp(`<script[^>]*src=["'].*?${file}["'][^>]*><\/script>`, 'g');
            html = html.replace(scriptRegex, `<script type="module">${content}</script>`);
        } else if (file.endsWith('.css')) {
            console.log(`   🎨 Inlining CSS: ${file}`);
            // Replace link tag
            const linkRegex = new RegExp(`<link[^>]*href=["'].*?${file}["'][^>]*>`, 'g');
            html = html.replace(linkRegex, `<style>${content}</style>`);
        }
    });
} else {
    console.warn('⚠️ Warning: No assets directory found to inline.');
}

// Write to index.html
fs.writeFileSync(finalHtmlPath, html);
console.log('✅ Inlined assets and wrote to dist/index.html');

// Delete legacy HTML and Assets folder (cleanup)
try {
    fs.unlinkSync(legacyHtmlPath);
    console.log('🗑️  Removed index-legacy.html');

    // Optional: remove assets dir if purely inlined
    // fs.rmSync(assetsDir, { recursive: true, force: true });
} catch (e) {
    console.warn('⚠️ Could not remove index-legacy.html', e);
}
