import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchSwagger() {
    console.log('[DEBUG] Searching for Swagger JSON with Auth...');

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
            '/api/swagger.json',
            '/swagger.json',
            '/api/documentation/swagger.json',
            '/api/v2/swagger.json'
        ];

        for (const ep of endpoints) {
            const url = `${cleanBaseUrl}${ep}`;
            try {
                // Fetch with auth headers
                const res = await axios.get(url, { headers });
                console.log(`\n[DEBUG] SUCCESS! Found Swagger JSON at ${url}`);

                // Analyze POST /groups
                if (res.data.paths && res.data.paths['/groups'] && res.data.paths['/groups'].post) {
                    console.log('--- POST /groups Parameters ---');
                    const post = res.data.paths['/groups'].post;
                    if (post.parameters) {
                        console.log(JSON.stringify(post.parameters, null, 2));
                    }
                    if (post.requestBody) {
                        console.log('--- POST /groups Request Body ---');
                        console.log(JSON.stringify(post.requestBody, null, 2));
                    }
                } else {
                    console.log('--- POST /groups NOT FOUND in Swagger ---');
                }
                return; // Found it, exit.

            } catch (e) {
                // console.log(`[DEBUG] FAILED ${url}: ${e.response?.status}`);
            }
        }
    } catch (error) {
        console.error('[DEBUG] Fatal Error:', error.response?.data || error.message);
    }
}

fetchSwagger();
