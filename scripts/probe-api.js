import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function probeApi() {
    console.log('[DEBUG] Probing API for Metadata...');

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

        // 1. WhoAmI -> Often reveals default campus
        try {
            console.log('\n[DEBUG] GET /api/whoami ...');
            const res = await axios.get(`${baseUrl}api/whoami`, { headers });
            console.log('User Data:', JSON.stringify(res.data, null, 2));
        } catch (e) { console.error('Failed WhoAmI:', e.message); }

        // 2. Campuses?
        try {
            console.log('\n[DEBUG] GET /api/campuses ...');
            const res = await axios.get(`${baseUrl}api/campuses`, { headers });
            console.log('Campuses:', JSON.stringify(res.data.data, null, 2));
        } catch (e) {
            // Try Legacy Campuses via MasterData again? Or just brute force
            console.error('Failed Campuses:', e.message);
        }

        // 3. Swagger again (with exact path provided by user implicitly)
        // User said: "https://baptizo.church.tools/api" -> Maybe /api/swagger?
        const swaggerEndpoints = [
            '/api/swagger',
            '/api/docs/swagger.json',
            '/system/swagger.json'
        ];

        for (const ep of swaggerEndpoints) {
            const url = `${cleanBaseUrl}${ep}`;
            try {
                const res = await axios.get(url, { headers });
                console.log(`[DEBUG] Found Swagger at ${url}`);
                const filePath = path.join(__dirname, 'churchtools_swagger_probe.json');
                fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2));
            } catch (e) { }
        }

    } catch (error) {
        console.error('[DEBUG] Fatal Error:', error.response?.data || error.message);
    }
}

probeApi();
