import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchApiDocs() {
    console.log('[DEBUG] Fetching API Docs...');

    // 1. Read .env
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

        console.log('[DEBUG] Fetching /api content...');
        const res = await axios.get(`${baseUrl}api`, { headers });
        console.log('HTML Length:', res.data.length);

        // Write to a temporary file for analysis
        fs.writeFileSync('api_docs.html', res.data);
        console.log('Saved to api_docs.html');

    } catch (error) {
        console.error('[DEBUG] Error:', error.response?.data || error.message);
    }
}

fetchApiDocs();
