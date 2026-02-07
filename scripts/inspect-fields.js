
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env manually BEFORE importing client
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);

if (fs.existsSync(envPath)) {
    const buffer = fs.readFileSync(envPath);
    let envConfig;
    // Check for UTF-16 LE BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        console.log('Detected UTF-16 LE encoding');
        envConfig = buffer.toString('utf16le');
    } else {
        envConfig = buffer.toString('utf8');
    }

    envConfig.split(/\r?\n/).forEach(line => {
        const trimLine = line.trim();
        if (!trimLine || trimLine.startsWith('#')) return;

        const equalsIndex = trimLine.indexOf('=');
        if (equalsIndex > -1) {
            // Sanitize key to remove potential invisible characters (BOM, nulls)
            let key = trimLine.substring(0, equalsIndex).trim();
            key = key.replace(/[^\x20-\x7E]/g, '');

            let value = trimLine.substring(equalsIndex + 1).trim();
            value = value.replace(/[^\x20-\x7E]/g, '');
            console.log(`Setting env: [${key}] = [${value.substring(0, 5)}...]`);
            process.env[key] = value;
        } else {
            console.log(`Skipping line (no equals): [${trimLine}]`);
        }
    });
} else {
    console.error('❌ .env file not found!');
    process.exit(1);
}

// Verify critical env vars
console.log('VITE_BASE_URL:', process.env.VITE_BASE_URL);
console.log('VITE_LOGIN_TOKEN:', process.env.VITE_LOGIN_TOKEN ? '(Masked)' : 'MISSING');

if (!process.env.VITE_BASE_URL || !process.env.VITE_LOGIN_TOKEN) {
    console.error('❌ Missing VITE_BASE_URL or VITE_LOGIN_TOKEN');
    process.exit(1);
}

// Dynamic import to ensure env vars are set first
const { churchtoolsClient } = await import('@churchtools/churchtools-client');

// Set Base URL if possible
if (typeof churchtoolsClient.setBaseUrl === 'function' && process.env.VITE_BASE_URL) {
    churchtoolsClient.setBaseUrl(process.env.VITE_BASE_URL);
}

// Authenticate
console.log('Logging in with token...');
try {
    console.log('Logging in with token...');
    const loginRes = await churchtoolsClient.loginWithToken(process.env.VITE_LOGIN_TOKEN);
    console.log('✅ Login successful!');

    // In Node (non-browser), we might need to manually handle the session cookie
    if (loginRes && loginRes.headers && loginRes.headers['set-cookie']) {
        const cookies = loginRes.headers['set-cookie'];
        console.log('Captured Cookies:', cookies);

        // Try to set global axios defaults if accessible
        // churchtoolsClient likely uses an internal axios instance.
        // We can try to attach it to future requests if exposed, or just rely on cookie jar if enabled.
        // Since we see setCookieJar in types, maybe it expects one.

        // Hack: Try setting Cookie header on defaults if exposed
        if (churchtoolsClient.ax && churchtoolsClient.ax.defaults) {
            churchtoolsClient.ax.defaults.headers.Cookie = cookies.join('; ');
            console.log('Set Cookie on internal axios instance.');
        } else if (churchtoolsClient.defaults) { // Fallback property name?
            churchtoolsClient.defaults.headers.common['Cookie'] = cookies.join('; ');
        }
    }

} catch (e) {
    console.error('❌ Login failed:', e.message);
    if (e.response) console.error('Response:', e.response.data);
    process.exit(1);
}


async function inspectFields() {
    console.log('🔍 Inspecting DB Fields...');

    try {
        // Try to fetch fields. 
        // Based on docs, /api/db/fields -> DB Fields
        // or /api/persons/fields (not standard)
        // Let's try /api/fields first (general)
        // Note: Client might auto-prepend /api if configured, or base URL might need it.
        // Base URL is https://baptizo.church.tools/

        // Try fetching DB fields
        // Correct endpoint for DB fields in CT is often just /db/fields 
        console.log('Fetching /db/fields...');
        const response = await churchtoolsClient.get('/db/fields');
        const fields = Array.isArray(response) ? response : (response.data || []);

        console.log(`Found ${fields.length} DB fields.`);

        const typoField = fields.find(f => f.key === 'taufmanager_onboaring' || f.name === 'taufmanager_onboaring' || f.column === 'taufmanager_onboaring');

        if (typoField) {
            console.log('✅ Found Typo Field:', JSON.stringify(typoField, null, 2));

            // Write definition to a file to use later
            fs.writeFileSync(path.join(__dirname, 'typo-field-def.json'), JSON.stringify(typoField, null, 2));
            console.log('Saved field definition to scripts/typo-field-def.json');

        } else {
            console.warn('⚠️ Could not find field "taufmanager_onboaring" in /db/fields.');
            console.log('First 5 field keys:', fields.slice(0, 5).map(f => f.column || f.name || f.key || f.id));
        }

    } catch (error) {
        console.error('❌ Error fetching fields:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

inspectFields();
