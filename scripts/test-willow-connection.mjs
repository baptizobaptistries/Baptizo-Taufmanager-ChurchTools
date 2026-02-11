/**
 * Explore Willow API v2: Fix required fields, explore custom field structure
 * Writes results to scripts/api-output.txt
 */
import { writeFileSync } from 'fs';

const BASE_URL = 'https://willow-extensions.church.tools';
const USERNAME = 'schoedel.stefan@gmail.com';
const PASSWORD = 'Stefan1!';

const WILLOW_IDS = {
    interessentenGroup: 652,
    getauftGroup: 655,
    fields: {
        onboarding: 172, seminar: 175, taufe: 178,
        urkunde: 181, integration: 184, offboarding: 187, status: 190,
    },
    statusOptions: { aktiv: 4, inaktiv: 5 },
};

let loginCookie = '';
const log = [];
function L(...args) { const line = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '); log.push(line); }

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
    // Login
    const login = await api('POST', '/api/login', { username: USERNAME, password: PASSWORD });
    if (!login.ok) { L('Login failed'); return; }
    L('✅ Logged in as Stefan Schödel');

    // 1. Get full person masterdata and dump ALL fields
    const md = await api('GET', '/api/person/masterdata');
    const allFields = md.data.data?.personFields || [];
    L(`\n=== ALL PERSON FIELDS (${allFields.length} total) ===`);
    for (const f of allFields) {
        L(`  key=${f.key || 'null'} | id=${f.id} | type=${f.fieldTypeCode} | name=${f.name} | catId=${f.fieldCategoryId}`);
    }

    // Also dump personFieldOptions
    const allOpts = md.data.data?.personFieldOptions || [];
    L(`\n=== PERSON FIELD OPTIONS (${allOpts.length} total) ===`);
    for (const o of allOpts) {
        L(`  fieldId=${o.personFieldId} | optionId=${o.id} | value=${o.name || o.designation}`);
    }

    // Also dump departments
    const depts = md.data.data?.departments || [];
    L(`\n=== DEPARTMENTS (${depts.length}) ===`);
    for (const d of depts) {
        L(`  id=${d.id} | name=${d.name}`);
    }

    // Also dump campuses
    const campuses = md.data.data?.campuses || [];
    L(`\n=== CAMPUSES (${campuses.length}) ===`);
    for (const c of campuses) {
        L(`  id=${c.id} | name=${c.name}`);
    }

    // 2. Create person with required fields
    L('\n=== CREATING TEST PERSON ===');
    const createBody = {
        firstName: 'Dora',
        lastName: 'Becker',
        sexId: 2,
        email: 'dora.becker@test.de',
        departmentIds: depts.length > 0 ? [depts[0].id] : [1],
        statusId: 1,
        campusId: campuses.length > 0 ? campuses[0].id : 0,
    };
    L('Create body:', createBody);
    const create = await api('POST', '/api/persons', createBody);
    if (!create.ok) {
        L('Create FAILED:', create.data);
        writeFileSync('scripts/api-output.txt', log.join('\n'), 'utf8');
        return;
    }
    const pid = create.data.data.id;
    L('✅ Created ID:', pid);

    // 3. Dump all person data to see available key names
    const personData = create.data.data;
    L('\n=== PERSON DATA KEYS ===');
    for (const [k, v] of Object.entries(personData)) {
        if (k.includes('taufmanager') || k.startsWith('f_')) {
            L(`  ${k}: ${JSON.stringify(v)}`);
        }
    }
    L('\n=== ALL PERSON KEYS ===');
    L(Object.keys(personData).join(', '));

    // 4. Try setting taufmanager fields
    L('\n=== SETTING TAUFMANAGER FIELDS ===');

    // Try all possible key formats for onboarding
    const onboardingAttempts = [
        { body: { taufmanager_onboarding: '2023-08-01' }, label: 'taufmanager_onboarding' },
        { body: { 'taufmanager_onboarding': '2023-08-01' }, label: 'taufmanager_onboarding (quoted)' },
        { body: { [`f_${WILLOW_IDS.fields.onboarding}`]: '2023-08-01' }, label: `f_172` },
    ];
    for (const a of onboardingAttempts) {
        const r = await api('PATCH', `/api/persons/${pid}`, a.body);
        L(`  ${a.label} => ${r.ok ? '✅' : '❌'} ${r.status}`);
        if (!r.ok) L(`    Error:`, r.data);
        if (r.ok) break;
    }

    // 5. Try status
    L('\n=== SETTING TAUFMANAGER STATUS ===');
    const statusAttempts = [
        { body: { taufmanager_status: 4 }, label: 'taufmanager_status=4' },
        { body: { taufmanager_status: '4' }, label: 'taufmanager_status="4"' },
        { body: { [`f_${WILLOW_IDS.fields.status}`]: 4 }, label: 'f_190=4' },
        { body: { [`f_${WILLOW_IDS.fields.status}`]: '4' }, label: 'f_190="4"' },
    ];
    for (const a of statusAttempts) {
        const r = await api('PATCH', `/api/persons/${pid}`, a.body);
        L(`  ${a.label} => ${r.ok ? '✅' : '❌'} ${r.status}`);
        if (!r.ok && r.data?.errors) L(`    Error:`, r.data.errors[0]);
        if (r.ok) break;
    }

    // 6. Add to group
    L('\n=== ADDING TO GROUP GETAUFT (655) ===');
    // Groups 652 and 655 are groupType 7
    // Find participant role for groupType 7
    const roles = md.data.data?.roles || [];
    const participantRole = roles.find(r => r.groupTypeId === 7 && (r.name === 'participant' || r.name === 'Teilnehmer'));
    L('Participant role for type 7:', participantRole);

    if (participantRole) {
        const addR = await api('PUT', `/api/groups/${WILLOW_IDS.getauftGroup}/members/${pid}`, {
            groupRoleId: participantRole.id,
        });
        L(`  Result: ${addR.ok ? '✅' : '❌'} ${addR.status} ${addR.ok ? '' : JSON.stringify(addR.data)}`);
    }

    // 7. Final readback
    L('\n=== FINAL READBACK ===');
    const final = await api('GET', `/api/persons/${pid}`);
    const fp = final.data.data;
    L(`${fp.firstName} ${fp.lastName} (ID: ${fp.id})`);
    for (const [k, v] of Object.entries(fp)) {
        if ((k.includes('taufmanager') || k.startsWith('f_')) && v !== null) {
            L(`  ${k}: ${JSON.stringify(v)}`);
        }
    }

    // Groups
    const groups = await api('GET', `/api/persons/${pid}/groups`);
    L('\nGroups:');
    if (groups.ok) {
        for (const g of (groups.data.data || [])) {
            L(`  groupId=${g.groupId} role=${g.groupRoleId}`);
        }
    }

    L(`\n=== DONE === Verify: ${BASE_URL}/#/person/${pid}`);
    writeFileSync('scripts/api-output.txt', log.join('\n'), 'utf8');
    console.log('Output written to scripts/api-output.txt');
}

main().catch(e => { L('FATAL:', e.message, e.stack); writeFileSync('scripts/api-output.txt', log.join('\n'), 'utf8'); });
