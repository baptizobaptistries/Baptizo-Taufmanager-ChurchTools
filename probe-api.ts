import { churchtoolsClient } from './src/lib/main';
import { getAdminSettings } from './src/lib/kv-store';

async function testApi() {
    console.log('--- API Probe Startup ---');
    try {
        console.log('1. Testing /api/config...');
        const config = await churchtoolsClient.get('/config');
        console.log('   Config success! Version:', (config as any).version || 'Unknown');

        console.log('2. Testing /api/custommodules...');
        try {
            const modules = await churchtoolsClient.get('/custommodules');
            console.log('   CustomModules success! Found:', (modules as any).length, 'modules');
        } catch (e: any) {
            console.warn('   CustomModules failed with status:', e.response?.status || e.message);
        }

        console.log('3. Testing Admin Settings Flow...');
        const settings = await getAdminSettings();
        console.log('   Settings retrieval result:', settings ? 'SUCCESS' : 'NULL');

    } catch (e: any) {
        console.error('CRITICAL API ERROR:', e.message);
        if (e.response) console.error('Status:', e.response.status, 'Data:', e.response.data);
    }
}

testApi();
