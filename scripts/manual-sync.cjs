const axios = require('axios');

async function runSync() {
    const baseUrl = 'https://baptizo.church.tools/api';
    const username = 'mail@baptizo.church';
    const password = 'chU2025,3!';

    console.log('--- STARTING GLOBAL SYNC ---');

    // 1. Login
    const loginRes = await axios.post(baseUrl + '/login', { username, password });
    const cookie = loginRes.headers['set-cookie'];
    const headers = {
        Cookie: cookie.join('; '),
        'Content-Type': 'application/json'
    };

    // Get CSRF token for PUT/DELETE
    // ChurchTools usually sends it in a cookie called 'CSRF' or 'csrf_token'
    // or we can just try to fetch /whoami and see if it's there
    const whoAmI = await axios.get(baseUrl + '/whoami', { headers });
    // In our case, we'll just try to use the cookie.

    const interestGroupId = 13;
    const baptizedGroupId = 16;

    // 2. Fetch current members of target groups
    console.log('Fetching groups...');
    const interestRes = await axios.get(baseUrl + `/groups/${interestGroupId}/members`, { headers });
    const baptizedRes = await axios.get(baseUrl + `/groups/${baptizedGroupId}/members`, { headers });

    const interestMembers = interestRes.data.data || [];
    const baptizedMembers = baptizedRes.data.data || [];

    const interestParticipantPids = new Set(interestMembers.filter(m => m.groupTypeRoleId === 22).map(m => m.personId));
    const baptizedParticipantPids = new Set(baptizedMembers.filter(m => m.groupTypeRoleId === 22).map(m => m.personId));

    console.log(`Current: Interest=${interestParticipantPids.size}, Baptized=${baptizedParticipantPids.size}`);

    // 3. Iterate ALL persons
    console.log('Iterating all persons...');
    let page = 1;
    let hasMore = true;
    let stats = { movedToBaptized: 0, movedToInterest: 0, skipped: 0 };

    while (hasMore) {
        const res = await axios.get(baseUrl + `/persons?limit=100&page=${page}`, { headers });
        const persons = res.data.data || [];

        if (persons.length === 0) {
            hasMore = false;
            break;
        }

        for (const p of persons) {
            const pid = p.id;
            if (pid === 1) continue; // Skip Admin

            // Need baptism date (taufmanager_taufe)
            // It's in the person detail
            const detailRes = await axios.get(baseUrl + `/persons/${pid}`, { headers });
            const detail = detailRes.data.data || detailRes.data;

            const hasBaptismDate = !!detail.taufmanager_taufe;
            const hasOnboarding = !!detail.taufmanager_onboarding;
            const hasOffboarding = !!detail.taufmanager_offboarding;

            if (!hasOnboarding || hasOffboarding) {
                stats.skipped++;
                continue;
            }

            const inInterest = interestParticipantPids.has(pid);
            const inBaptized = baptizedParticipantPids.has(pid);

            if (hasBaptismDate) {
                if (!inBaptized) {
                    console.log(`[SYNC] ${p.firstName} ${p.lastName} (ID ${pid}) -> ADD to Baptized (16)`);
                    await axios.put(baseUrl + `/groups/16/members/${pid}`, { groupTypeRoleId: 22 }, { headers });
                    stats.movedToBaptized++;
                }
                if (inInterest) {
                    console.log(`[SYNC] ${p.firstName} ${p.lastName} (ID ${pid}) -> REMOVE from Interest (13)`);
                    await axios.delete(baseUrl + `/groups/13/members/${pid}`, { headers });
                }
            } else {
                if (!inInterest) {
                    console.log(`[SYNC] ${p.firstName} ${p.lastName} (ID ${pid}) -> ADD to Interest (13)`);
                    await axios.put(baseUrl + `/groups/13/members/${pid}`, { groupTypeRoleId: 22 }, { headers });
                    stats.movedToInterest++;
                }
                if (inBaptized) {
                    console.log(`[SYNC] ${p.firstName} ${p.lastName} (ID ${pid}) -> REMOVE from Baptized (16)`);
                    await axios.delete(baseUrl + `/groups/16/members/${pid}`, { headers });
                }
            }
        }

        if (persons.length < 100) hasMore = false;
        page++;
    }

    console.log('--- SYNC COMPLETE ---');
    console.log(JSON.stringify(stats, null, 2));
}

runSync().catch(err => {
    console.error('Sync failed:', err.response?.data || err.message);
    process.exit(1);
});
