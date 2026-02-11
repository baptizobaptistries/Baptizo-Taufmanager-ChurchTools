/**
 * Mirror Dora Becker completely to Willow
 * Strategy: Update existing person 2893 with all fields, or create with force flag
 */
import { writeFileSync } from 'fs';

const BASE_URL = 'https://willow-extensions.church.tools';
const USERNAME = 'schoedel.stefan@gmail.com';
const PASSWORD = 'Stefan1!';

const WILLOW = {
    groups: { interessenten: 652, getauft: 655 },
    participantRoleId: 46,
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
    L('=== Mirroring Dora Becker to Willow ===\n');

    // Login
    const login = await api('POST', '/api/login', { username: USERNAME, password: PASSWORD });
    if (!login.ok) { L('❌ Login failed'); return; }
    L('✅ Logged in');

    // Check if person 2893 still exists
    let pid;
    const existing = await api('GET', '/api/persons/2893');
    if (existing.ok && existing.data.data?.firstName === 'Dora') {
        pid = 2893;
        L(`\n✅ Existing Dora Becker found at ID: ${pid} — will update her`);
    } else {
        // Create new with force flag
        L('\n--- Creating Dora Becker (with force flag) ---');
        const createBody = {
            firstName: 'Dora',
            lastName: 'Becker',
            sexId: 2,
            email: 'dora.becker@test.de',
            departmentIds: [1],
            statusId: 3,
            campusId: 0,
            force: true,
        };
        const create = await api('POST', '/api/persons?force=true', createBody);
        if (!create.ok) {
            L('❌ Create FAILED:', create.data);
            writeFileSync('scripts/api-output.txt', log.join('\n'), 'utf8');
            return;
        }
        pid = create.data.data.id;
        L(`✅ Created ID: ${pid}`);
    }

    // Update ALL fields via PATCH
    L('\n--- Setting ALL fields on person ' + pid + ' ---');
    const fullPatch = {
        // Native CT fields
        sexId: 2,
        email: 'dora.becker@test.de',
        statusId: 3,                // Mitglied
        campusId: 0,                // Winterhude
        departmentIds: [1],         // Gemeindeliste
        firstContact: '2026-02-04',
        dateOfBelonging: '2025-11-24',
        privacyPolicyAgreementDate: '2025-11-24',
        privacyPolicyAgreementTypeId: 3,
        privacyPolicyAgreementWhoId: 1,
        // Taufmanager custom fields
        taufmanager_status: 4,              // Aktiv
        taufmanager_onboarding: '2023-08-01',
        taufmanager_seminar: '2023-08-12',
        taufmanager_taufe: '2023-09-02',
        taufmanager_integration: '2023-10-02',
    };

    const patch = await api('PATCH', `/api/persons/${pid}`, fullPatch);
    if (patch.ok) {
        L('✅ All fields set successfully in one PATCH');
    } else {
        L('❌ PATCH failed:', patch.data);
        // Fallback: try fields one by one
        L('Trying fields individually...');
        for (const [key, value] of Object.entries(fullPatch)) {
            const r = await api('PATCH', `/api/persons/${pid}`, { [key]: value });
            L(`  ${key}=${JSON.stringify(value)} => ${r.ok ? '✅' : '❌'}`);
        }
    }

    // Add to Getauft group
    L('\n--- Adding to Getauft group (655) ---');
    const groupR = await api('PUT', `/api/groups/${WILLOW.groups.getauft}/members/${pid}`, {
        groupRoleId: WILLOW.participantRoleId,
    });
    L(`Group: ${groupR.ok ? '✅ Added to Getauft (Teilnehmer)' : '❌ ' + JSON.stringify(groupR.data)}`);

    // Full verification readback
    L('\n========================================');
    L('=== COMPLETE VERIFICATION READBACK ===');
    L('========================================');
    const final = await api('GET', `/api/persons/${pid}`);
    const p = final.data.data;

    L(`\nPerson: ${p.firstName} ${p.lastName}`);
    L(`ID: ${p.id}`);
    L(`Email: ${p.email}`);
    L(`Geschlecht: ${p.sexId === 1 ? 'männlich' : 'weiblich'} (${p.sexId})`);
    L(`Personenstatus: ${p.statusId} (3=Mitglied)`);
    L(`Campus: ${p.campusId}`);
    L(`Departments: ${JSON.stringify(p.departmentIds)}`);
    L(`Erstkontakt: ${p.firstContact}`);
    L(`Zugehörig seit: ${p.dateOfBelonging}`);
    L(`Datenschutz: ${p.privacyPolicyAgreementDate} (Typ: ${p.privacyPolicyAgreementTypeId}, Wer: ${p.privacyPolicyAgreementWhoId})`);
    L('');
    L('--- Taufmanager Felder ---');
    L(`  Status: ${p.taufmanager_status} (4=Aktiv, 5=Inaktiv)`);
    L(`  Onboarding: ${p.taufmanager_onboarding}`);
    L(`  Seminar: ${p.taufmanager_seminar}`);
    L(`  Taufe: ${p.taufmanager_taufe}`);
    L(`  Urkunde: ${p.taufmanager_urkunde || '(leer — korrekt, CSV auch leer)'}`);
    L(`  Integration: ${p.taufmanager_integration}`);
    L(`  Offboarding: ${p.taufmanager_offboarding || '(leer — korrekt, CSV auch leer)'}`);

    // Verify groups
    const groups = await api('GET', `/api/persons/${pid}/groups`);
    L('\n--- Gruppenzugehörigkeiten ---');
    if (groups.ok && groups.data.data) {
        for (const g of groups.data.data) {
            const gInfo = await api('GET', `/api/groups/${g.groupId}`);
            const gName = gInfo.data?.data?.name || `Group ${g.groupId}`;
            L(`  ${gName} (ID: ${g.groupId}, Rolle: ${g.groupRoleId})`);
        }
    }
    if (!groups.data?.data?.length) L('  (keine Gruppen)');

    L(`\n=== FERTIG ===`);
    L(`Prüfen: ${BASE_URL}/#/person/${pid}`);

    writeFileSync('scripts/api-output.txt', log.join('\n'), 'utf8');
    console.log('Done! See scripts/api-output.txt');
}

main().catch(e => { L('FATAL:', e.message); writeFileSync('scripts/api-output.txt', log.join('\n'), 'utf8'); });
