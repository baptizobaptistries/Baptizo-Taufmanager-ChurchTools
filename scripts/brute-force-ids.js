import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bruteForceGroups() {
    console.log('[DEBUG] Brute-Forcing Valid IDs...');

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

        // Try IDs 0 to 5 for Type, Category, Status
        // Standard defaults: Type=1, Cat=1, Status=1

        let found = false;

        const maxId = 5;

        // We assume Status=1 is safe (Active) or 2 (Waiting).
        // Categories/Types are the big unknown.

        for (let t = 1; t <= maxId; t++) {
            if (found) break;
            for (let c = 1; c <= maxId; c++) {
                if (found) break;
                // Try creation
                const name = `BRUTE_FORCE_${t}_${c}`;
                console.log(`Trying Type=${t}, Cat=${c}...`);

                try {
                    const res = await axios.post(`${cleanBaseUrl}/api/groups`, {
                        name,
                        groupTypeId: t,
                        groupCategoryId: c,
                        groupStatusId: 1 // Assume 1 is valid status
                    }, { headers });

                    console.log(`[SUCCESS] Created Group with Type=${t}, Cat=${c}, Status=1 !! ID: ${res.data.data.id}`);
                    found = true;

                    // Cleanup
                    await axios.delete(`${cleanBaseUrl}/api/groups/${res.data.data.id}`, { headers });

                } catch (e) {
                    // console.log(`Failed T=${t}, C=${c}: ${e.response?.status}`);
                    if (e.response?.data?.errors) {
                        // Check if specific error
                        // console.log(JSON.stringify(e.response.data.errors));
                    }
                }
            }
        }

        if (!found) {
            console.log('[FAIL] Could not find valid ID combination in range 1-5.');
        }

    } catch (error) {
        console.error('[DEBUG] Fatal Error:', error.response?.data || error.message);
    }
}

bruteForceGroups();
