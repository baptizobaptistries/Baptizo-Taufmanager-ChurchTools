/**
 * Fix: Add correct group memberships for all migrated persons.
 * Logic:
 *   - Has taufmanager_taufe → Getauft (655)
 *   - Has taufmanager_onboarding but NO taufe → Interessenten (652)
 *   - Has taufmanager_offboarding → skip (offboarded)
 *   - Hannes Gruppenleiter → Leader of both groups
 *
 * Usage: node scripts/fix-groups.mjs
 */
import { writeFileSync } from 'fs';

const BASE_URL = 'https://willow-extensions.church.tools';
const USERNAME = 'schoedel.stefan@gmail.com';
const PASSWORD = 'Stefan1!';

const WILLOW = {
    groups: { interessenten: 652, getauft: 655 },
    roles: { participant: 46, leader: 49 },
};

let loginCookie = '';
const log = [];
function L(...args) { log.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')); }

async function api(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (loginCookie) headers['Cookie'] = loginCookie;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${BASE_URL}${path}`, options);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) loginCookie = setCookie;
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: response.ok, status: response.status, data };
}

async function main() {
    L('=== Fix Group Assignments ===\n');

    const login = await api('POST', '/api/login', { username: USERNAME, password: PASSWORD });
    if (!login.ok) { L('❌ Login failed'); return; }
    L('✅ Logged in\n');

    // Get ALL persons with taufmanager fields
    // We search by pages
    let allPersons = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const r = await api('GET', `/api/persons?limit=100&page=${page}`);
        const persons = r.data?.data || [];
        if (persons.length === 0) break;
        allPersons = allPersons.concat(persons);
        if (persons.length < 100) hasMore = false;
        page++;
    }

    L(`📋 Found ${allPersons.length} total persons in Willow\n`);

    // Filter to our migrated persons (those with taufmanager fields set)
    const taufPersons = allPersons.filter(p =>
        p.taufmanager_onboarding || p.taufmanager_taufe || p.taufmanager_status
    );
    L(`📋 ${taufPersons.length} persons have taufmanager data\n`);

    let addedToGetauft = 0;
    let addedToInteressenten = 0;
    let skippedOffboarded = 0;
    let leaderSet = 0;

    for (const p of taufPersons) {
        const name = `${p.firstName} ${p.lastName} (ID:${p.id})`;
        const hasOffboarding = !!p.taufmanager_offboarding;
        const hasTaufe = !!p.taufmanager_taufe;
        const hasOnboarding = !!p.taufmanager_onboarding;

        if (hasOffboarding) {
            L(`  ⏭️  ${name} — offboarded, skip`);
            skippedOffboarded++;
            continue;
        }

        if (hasTaufe) {
            // → Getauft group
            const r = await api('PUT', `/api/groups/${WILLOW.groups.getauft}/members/${p.id}`, {
                groupRoleId: WILLOW.roles.participant,
            });
            L(`  ✅ ${name} → Getauft (${r.ok ? 'OK' : 'FAIL'})`);
            if (r.ok) addedToGetauft++;
        } else if (hasOnboarding) {
            // → Interessenten group
            const r = await api('PUT', `/api/groups/${WILLOW.groups.interessenten}/members/${p.id}`, {
                groupRoleId: WILLOW.roles.participant,
            });
            L(`  ✅ ${name} → Interessenten (${r.ok ? 'OK' : 'FAIL'})`);
            if (r.ok) addedToInteressenten++;
        }
    }

    // Handle Hannes Gruppenleiter separately — leader of both groups
    const hannes = allPersons.find(p => p.firstName === 'Hannes' && p.lastName === 'Gruppenleiter');
    if (hannes) {
        L(`\n👤 Setting Hannes Gruppenleiter (ID:${hannes.id}) as LEADER of both groups...`);
        for (const gid of [WILLOW.groups.interessenten, WILLOW.groups.getauft]) {
            const r = await api('PUT', `/api/groups/${gid}/members/${hannes.id}`, {
                groupRoleId: WILLOW.roles.leader,
            });
            L(`  Group ${gid}: ${r.ok ? '✅' : '❌'}`);
            if (r.ok) leaderSet++;
        }
    }

    L(`\n========================================`);
    L(`=== RESULTS ===`);
    L(`========================================`);
    L(`✅ Added to Getauft:       ${addedToGetauft}`);
    L(`✅ Added to Interessenten: ${addedToInteressenten}`);
    L(`⏭️  Skipped (offboarded):  ${skippedOffboarded}`);
    L(`👤 Leader assignments:     ${leaderSet}`);

    writeFileSync('scripts/fix-groups-output.txt', log.join('\n'), 'utf8');
    console.log(`Done! Getauft:${addedToGetauft} Interessenten:${addedToInteressenten} Leader:${leaderSet}. See fix-groups-output.txt`);
}

main().catch(e => { L('FATAL:', e.message); writeFileSync('scripts/fix-groups-output.txt', log.join('\n'), 'utf8'); });
