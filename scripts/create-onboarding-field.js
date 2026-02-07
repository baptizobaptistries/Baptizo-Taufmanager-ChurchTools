
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { default: axios } = await import('axios');

// Load .env manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);

if (fs.existsSync(envPath)) {
    const buffer = fs.readFileSync(envPath);
    let envConfig = (buffer[0] === 0xFF && buffer[1] === 0xFE) ? buffer.toString('utf16le') : buffer.toString('utf8');
    envConfig.split(/\r?\n/).forEach(line => {
        const trimLine = line.trim();
        if (!trimLine || trimLine.startsWith('#')) return;
        const equalsIndex = trimLine.indexOf('=');
        if (equalsIndex > -1) {
            let key = trimLine.substring(0, equalsIndex).trim().replace(/[^\x20-\x7E]/g, '');
            let value = trimLine.substring(equalsIndex + 1).trim().replace(/[^\x20-\x7E]/g, '');
            process.env[key] = value;
        }
    });
}

const baseUrl = process.env.VITE_BASE_URL;
const token = process.env.VITE_LOGIN_TOKEN;

if (!baseUrl || !token) {
    console.error('❌ Missing VITE_BASE_URL or VITE_LOGIN_TOKEN');
    process.exit(1);
}

// Field Definition based on "taufmanager_onboaring" (ID 199)
const newFieldDef = {
    key: "taufmanager_onboarding",     // <--- THE FIX
    name: "Taufmanager: Onboarding",
    nameTranslated: "Taufmanager: Onboarding",
    shorty: "Taufmanager Onboarding",
    fieldCategoryCode: "f_church",
    fieldTypeCode: "date",
    isActive: true,
    secLevel: 3,
    sortKey: 22,
    lineEnding: "<br/>",
    deleteOnArchive: false,
    nullable: true,
    hideInFrontend: false,
    options: []
};

async function createField() {
    console.log('🚀 Creating Field [taufmanager_onboarding]...');
    const endpoints = [
        '/api/person/fields',
        '/api/persons/fields',
        '/api/fields', // usually GET only
        '/api/db/fields' // old api?
    ];

    for (const ep of endpoints) {
        const url = `${baseUrl.replace(/\/$/, '')}${ep}`;
        console.log(`Trying POST ${url}...`);

        try {
            const response = await axios.post(url, newFieldDef, {
                headers: { 'Authorization': `Login ${token}` }
            });

            console.log(`✅ Field Created Successfully via ${ep}!`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            return;

        } catch (error) {
            const status = error.response ? error.response.status : error.message;
            console.log(`❌ Creation Failed via ${ep}: ${status}`);
        }
    }
    console.log('❌ Could not create field automatically. Please create it manually in ChurchTools Admin > DB Fields.');
}

createField();
