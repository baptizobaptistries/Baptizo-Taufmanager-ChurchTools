
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { default: axios } = await import('axios');

// Load .env manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

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

// Configuration
const OLD_FIELD = 'taufmanager_onboaring';
const NEW_FIELD = 'taufmanager_onboarding';
const PAGE_SIZE = 50;

async function migrate() {
    console.log('🚀 Starting Migration: Fix Typo in Onboarding Field');
    console.log(`From: [${OLD_FIELD}] -> To: [${NEW_FIELD}]`);

    // 1. Fetch all persons (pagination)
    // We cannot easily filter by custom field != null in API without specific search filters.
    // So we might need to iterate or use search.
    // Let's try to search using /persons endpoint if possible, or iterate groups?
    // Iterating ALL persons might be heavy.
    // Is there a search endpoint? /api/persons?search=...
    // Or just iterate pages until done.

    console.log('Fetching persons...');
    let page = 1;
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = `${baseUrl.replace(/\/$/, '')}/api/persons?limit=${PAGE_SIZE}&page=${page}`;
            // console.log(`Fetching page ${page}...`);

            const response = await axios.get(url, {
                headers: { 'Authorization': `Login ${token}` }
            });

            const persons = response.data.data;
            const meta = response.data.meta;

            if (!persons || persons.length === 0) {
                hasMore = false;
                break;
            }

            for (const person of persons) {
                // Check if old field has value
                // Note: The API response might nest custom fields or return them top-level.
                // Usually top-level for known fields or in specific object.
                // Let's check top level first.

                const oldValue = person[OLD_FIELD];
                const newValue = person[NEW_FIELD];

                if (oldValue) {
                    // Check if migration exists
                    if (newValue === oldValue) {
                        // Already migrated
                        // console.log(`Person ${person.id}: Already migrated.`);
                        totalSkipped++;
                    } else {
                        // Needs migration
                        console.log(`Migrating Person ${person.id} (${person.firstName} ${person.lastName})...`);
                        console.log(`   Value: ${oldValue}`);

                        // Update
                        try {
                            const patchUrl = `${baseUrl.replace(/\/$/, '')}/api/persons/${person.id}`;
                            const patchData = {};
                            patchData[NEW_FIELD] = oldValue;

                            await axios.patch(patchUrl, patchData, {
                                headers: { 'Authorization': `Login ${token}` }
                            });
                            console.log('   ✅ Migrated');
                            totalMigrated++;
                        } catch (err) {
                            console.error(`   ❌ Failed to patch Person ${person.id}: ${err.message}`);
                            if (err.response && err.response.status === 404) {
                                console.error('      (Did you create the new field "taufmanager_onboarding" yet?)');
                            } else if (err.response) {
                                console.error('      Status:', err.response.status);
                            }
                            totalErrors++;
                        }
                    }
                }
            }

            // Pagination check
            if (meta && meta.pagination) {
                if (meta.pagination.current >= meta.pagination.lastPage) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                // Standard limit logic
                if (persons.length < PAGE_SIZE) hasMore = false;
                else page++;
            }

        } catch (error) {
            console.error('❌ Error fetching page:', error.message);
            hasMore = false;
        }
    }

    console.log('===================================');
    console.log(`Migration Complete.`);
    console.log(`Migrated: ${totalMigrated}`);
    console.log(`Skipped (Already done): ${totalSkipped}`);
    console.log(`Errors: ${totalErrors}`);
    console.log('===================================');

    if (totalErrors > 0) {
        console.log('⚠️  If errors included 404/400, please verify the NEW field exists in ChurchTools!');
    }
}

migrate();
