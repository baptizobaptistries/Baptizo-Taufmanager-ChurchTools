import axios from 'axios';
import fs from 'fs';

// Try to load credentials from .env if available, or use a hardcoded token for test
// For this test, we expect to be run in an environment where we can reach the API.
const baseUrl = 'https://baptizo.church.tools/api';
const token = 'YOUR_TOKEN_HERE'; // I'll need to get this from the user or .env

async function test(path) {
    console.log(`Testing ${baseUrl}${path}...`);
    try {
        const res = await axios.get(`${baseUrl}${path}`, {
            headers: { 'Authorization': `Login ${token}` }
        });
        console.log(`✅ Success ${path}:`, res.status);
        return true;
    } catch (e) {
        console.log(`❌ Fail ${path}:`, e.response?.status || e.message);
        return false;
    }
}

async function run() {
    await test('/config/kv-store');
    await test('/kv-store');
    await test('/config');
    await test('/custommodules');
}

// run();
console.log('Script ready. Need token to run.');
