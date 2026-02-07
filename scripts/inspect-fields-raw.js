
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Import axios dynamically to ensure we use the installed version
const { default: axios } = await import('axios');

// Load .env manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);

if (fs.existsSync(envPath)) {
    const buffer = fs.readFileSync(envPath);
    let envConfig;
    // Check for UTF-16 LE BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        envConfig = buffer.toString('utf16le');
    } else {
        envConfig = buffer.toString('utf8');
    }

    envConfig.split(/\r?\n/).forEach(line => {
        const trimLine = line.trim();
        if (!trimLine || trimLine.startsWith('#')) return;

        const equalsIndex = trimLine.indexOf('=');
        if (equalsIndex > -1) {
            let key = trimLine.substring(0, equalsIndex).trim();
            key = key.replace(/[^\x20-\x7E]/g, '');

            let value = trimLine.substring(equalsIndex + 1).trim();
            value = value.replace(/[^\x20-\x7E]/g, '');
            process.env[key] = value;
        }
    });
} else {
    console.error('❌ .env file not found!');
    process.exit(1);
}

const baseUrl = process.env.VITE_BASE_URL;
const token = process.env.VITE_LOGIN_TOKEN;

if (!baseUrl || !token) {
    console.error('❌ Missing VITE_BASE_URL or VITE_LOGIN_TOKEN');
    process.exit(1);
}

console.log('Using Base URL:', baseUrl);

async function inspectFields() {
    console.log('🔍 Inspecting DB Fields via Raw Axios...');

    // List of potential endpoints
    const endpoints = [
        '/api/fields',
        '/api/person/fields',
        '/api/cdb/fields',
        '/api/persons/schema',
        '/api/db/fields' // Retrying just in case
    ];

    for (const ep of endpoints) {
        try {
            // Remove trailing slash from base and leading from ep
            const cleanBase = baseUrl.replace(/\/$/, '');
            const url = `${cleanBase}${ep}`;

            console.log(`Trying: ${url}...`);
            const response = await axios.get(url, {
                headers: { 'Authorization': `Login ${token}` }
            });
            console.log(`✅ Success with ${ep}!`);

            const fields = response.data.data || response.data;
            console.log(`Found ${Array.isArray(fields) ? fields.length : 'invalid'} items.`);

            // Log first item if valid
            if (Array.isArray(fields) && fields.length > 0) {
                // console.log('Sample field:', JSON.stringify(fields[0]).substring(0, 100) + '...');
            }

            if (Array.isArray(fields)) {
                // Check if our field is there
                // Property names might vary: key, name, col_name, etc.
                const typoField = fields.find(f =>
                    f.key === 'taufmanager_onboaring' ||
                    f.name === 'taufmanager_onboaring' ||
                    f.col_name === 'taufmanager_onboaring' ||
                    f.internal_code === 'taufmanager_onboaring'
                );

                const correctField = fields.find(f =>
                    f.key === 'taufmanager_onboarding' ||
                    f.name === 'taufmanager_onboarding' ||
                    f.col_name === 'taufmanager_onboarding' ||
                    f.internal_code === 'taufmanager_onboarding'
                );

                if (typoField) {
                    console.log('✅ Found Typo Field:', JSON.stringify(typoField, null, 2));
                }

                if (correctField) {
                    console.log('✅ Found NEW Correct Field:', JSON.stringify(correctField, null, 2));
                    console.log('🎉 READY FOR MIGRATION!');
                    return;
                } else {
                    console.log('⚠️  NEW Field "taufmanager_onboarding" NOT FOUND yet.');
                }
            } else {
                console.log('Response was not an array.');
            }
        } catch (e) {
            const status = e.response ? e.response.status : 'Unknown';
            console.log(`❌ Failed ${ep}: ${status} - ${e.message}`);
        }
    }
    console.log('Finished probing. If field not found, please check CT Admin UI manually.');
}

inspectFields();
