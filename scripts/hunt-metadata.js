import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function huntMetadata() {
    console.log('[DEBUG] Hunting for Metadata (Types, Categories, Statuses)...');

    // 1. Read .env manually
    const envPath = path.resolve(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
        }
    });

    const baseUrl = env.VITE_BASE_URL;
    const username = env.VITE_USERNAME;
    const password = env.VITE_PASSWORD;
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    try {
        console.log('[DEBUG] Logging in...');
        const loginRes = await axios.post(`${baseUrl}api/login`, { username, password });
        const cookie = loginRes.headers['set-cookie'];
        const headers = cookie ? { 'Cookie': cookie.join('; ') } : {};

        const endpoints = [
            '/api/grouptypes',
            '/api/group/types',
            '/api/masterdata/grouptypes',
            '/api/groups/types',
            '/api/groupcategories',
            '/api/group/categories',
            '/api/masterdata/groupcategories',
            '/api/groups/categories',
            '/api/statuses/group',
            '/api/groupstatuses',
            '/api/masterdata'
        ];

        for (const ep of endpoints) {
            const url = `${cleanBaseUrl}${ep}`;
            try {
                // Fetch with auth headers
                const res = await axios.get(url, { headers });
                console.log(`\n[DEBUG] SUCCESS! Found Metadata at ${url}`);

                // Inspect data
                if (res.data.data) {
                    const data = res.data.data;
                    if (Array.isArray(data)) {
                        console.log('Sample Data:', JSON.stringify(data.slice(0, 3), null, 2));
                    } else {
                        console.log('Data Object Keys:', Object.keys(data));
                        // Deep inspect masterdata
                        if (data.groupTypes) console.log('Found groupTypes (Legacy)!');
                        if (data.groupCategory) console.log('Found groupCategory (Legacy)!');
                        if (data.groupStatus) console.log('Found groupStatus (Legacy)!');
                    }
                }
            } catch (e) {
                // console.log(`[DEBUG] FAILED ${url}: ${e.response?.status}`);
            }
        }

        // Try to create a group WITHOUT type to see error
        console.log('\n[DEBUG] Probing Creation Error Message...');
        try {
            const res = await axios.post(`${baseUrl}api/groups`, {
                name: 'PROBE_ERROR_MSG'
            }, { headers });
            // Should fail
            await axios.delete(`${baseUrl}api/groups/${res.data.data.id}`, { headers });
        } catch (e) {
            console.log('Creation Error Message:', JSON.stringify(e.response?.data, null, 2));
        }

    } catch (error) {
        console.error('[DEBUG] Fatal Error:', error.response?.data || error.message);
    }
}

huntMetadata();
