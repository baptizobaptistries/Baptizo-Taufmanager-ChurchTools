import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugGroups() {
    console.log('[DEBUG] Extracting Valid Group IDs via LEGACY API...');

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

    try {
        console.log('[DEBUG] Logging in...');
        const loginRes = await axios.post(`${baseUrl}api/login`, { username, password });
        const cookie = loginRes.headers['set-cookie'];
        const headers = cookie ? { 'Cookie': cookie.join('; ') } : {};

        // 1. Get MasterData (Legacy)
        try {
            console.log('\n[DEBUG] Fetching MasterData via index.php?q=churchdb/masterdata...');
            const res = await axios.get(`${baseUrl}index.php?q=churchdb/masterdata`, { headers });
            const data = res.data.data;

            if (data.groupTypes) {
                console.log('Valid Group Types:', Object.values(data.groupTypes).map(t => `${t.id}: ${t.bezeichnung}`).join(', '));
            } else { console.log('No groupTypes found (legacy structure might differ)'); }

            if (data.groupCategory) {
                console.log('Valid Group Categories:', Object.values(data.groupCategory).map(c => `${c.id}: ${c.bezeichnung}`).join(', '));
            } else { console.log('No groupCategory found'); }

            if (data.groupStatus) {
                console.log('Valid Group Statuses:', Object.values(data.groupStatus).map(s => `${s.id}: ${s.bezeichnung}`).join(', '));
            } else { console.log('No groupStatus found'); }

        } catch (e) {
            console.error('Failed Legacy MasterData:', e.message);
        }

    } catch (error) {
        console.error('[DEBUG] Fatal Error:', error.response?.data || error.message);
    }
}

debugGroups();
