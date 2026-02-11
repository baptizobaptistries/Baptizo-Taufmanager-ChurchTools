/**
 * Migrate ALL persons from dev CSV to Willow ChurchTools.
 * Skips: Dora Becker (already mirrored), Stefan Schödel (admin)
 * Special: Hannes Gruppenleiter → Leader of both groups
 *
 * Usage: node scripts/migrate-all-to-willow.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const BASE_URL = 'https://willow-extensions.church.tools';
const USERNAME = 'schoedel.stefan@gmail.com';
const PASSWORD = 'Stefan1!';

const WILLOW = {
    groups: { interessenten: 652, getauft: 655 },
    roles: { participant: 46, leader: 49 },
    department: 1,       // Gemeindeliste
    campus: 0,           // Winterhude
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

/**
 * Parse the CSV file and return structured person objects
 */
function parseCSV(csvPath) {
    const raw = readFileSync(csvPath, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim());

    // Header is line 0
    const header = parseCSVLine(lines[0]);

    const persons = [];
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        if (fields.length < 10) continue;

        const get = (colName) => {
            const idx = header.indexOf(colName);
            return idx >= 0 ? fields[idx]?.trim() || '' : '';
        };

        const firstName = get('Vorname');
        const lastName = get('Nachname');
        if (!firstName || !lastName) continue;

        // Parse gender: "weiblich (#2)" → 2, "männlich (#1)" → 1
        const genderStr = get('Geschlecht');
        const sexId = genderStr.includes('#1') ? 1 : genderStr.includes('#2') ? 2 : 0;

        // Parse statusId from "Mitglied (#3)" → 3
        const personStatusStr = get('Personenstatus');
        const statusMatch = personStatusStr.match(/#(\d+)/);
        const statusId = statusMatch ? parseInt(statusMatch[1]) : 3;

        // Parse taufmanager status: "Aktiv (#4)" → 4, "Inaktiv (#5)" → 5
        const tmStatusStr = get('Taufmanager: Status');
        const tmStatusMatch = tmStatusStr.match(/#(\d+)/);
        const tmStatus = tmStatusMatch ? parseInt(tmStatusMatch[1]) : null;

        // Parse group membership
        const groupStr = get('Kleingruppe') || '';
        let group = null;
        if (groupStr.includes('Getauft')) group = 'getauft';
        else if (groupStr.includes('Interessenten')) group = 'interessenten';

        persons.push({
            firstName,
            lastName,
            sexId,
            email: get('E-Mail') || get('E-Mail: Privat') || '',
            statusId,
            firstContact: get('Erstkontakt') || null,
            dateOfBelonging: get('Zugehörig seit') || null,
            privacyDate: get('Einwilligung erfolgt am') || null,
            // Taufmanager fields
            tmStatus,
            tmOnboarding: get('Taufmanager: Onboarding') || null,
            tmSeminar: get('Taufmanager: Seminar') || null,
            tmTaufe: get('Taufmanager: Taufe') || null,
            tmUrkunde: get('Taufmanager: Urkunde') || null,
            tmIntegration: get('Taufmanager: Integration') || null,
            tmOffboarding: get('Taufmanager: Offboarding') || null,
            // Group membership
            group,
        });
    }

    return persons;
}

/**
 * Simple CSV line parser that handles semicolons and quoted fields
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ';' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

async function createPerson(person) {
    // 1. Create person
    const createBody = {
        firstName: person.firstName,
        lastName: person.lastName,
        sexId: person.sexId,
        email: person.email,
        departmentIds: [WILLOW.department],
        statusId: person.statusId,
        campusId: WILLOW.campus,
    };
    if (person.firstContact) createBody.firstContact = person.firstContact;
    if (person.dateOfBelonging) createBody.dateOfBelonging = person.dateOfBelonging;
    if (person.privacyDate) {
        createBody.privacyPolicyAgreementDate = person.privacyDate;
        createBody.privacyPolicyAgreementTypeId = 3;  // Schriftliche Einwilligung
        createBody.privacyPolicyAgreementWhoId = 1;   // Person selbst
    }

    const create = await api('POST', '/api/persons?force=true', createBody);
    if (!create.ok) {
        return { ok: false, error: `Create failed: ${JSON.stringify(create.data?.message || create.data)}` };
    }
    const pid = create.data.data.id;

    // 2. Set Taufmanager fields
    const tmFields = {};
    if (person.tmStatus !== null) tmFields.taufmanager_status = person.tmStatus;
    if (person.tmOnboarding) tmFields.taufmanager_onboarding = person.tmOnboarding;
    if (person.tmSeminar) tmFields.taufmanager_seminar = person.tmSeminar;
    if (person.tmTaufe) tmFields.taufmanager_taufe = person.tmTaufe;
    if (person.tmUrkunde) tmFields.taufmanager_urkunde = person.tmUrkunde;
    if (person.tmIntegration) tmFields.taufmanager_integration = person.tmIntegration;
    if (person.tmOffboarding) tmFields.taufmanager_offboarding = person.tmOffboarding;

    if (Object.keys(tmFields).length > 0) {
        const patch = await api('PATCH', `/api/persons/${pid}`, tmFields);
        if (!patch.ok) {
            return { ok: false, pid, error: `PATCH TM fields failed: ${JSON.stringify(patch.data?.message)}` };
        }
    }

    // 3. Add to group
    if (person.group) {
        const groupId = person.group === 'getauft' ? WILLOW.groups.getauft : WILLOW.groups.interessenten;
        const roleId = person.isLeader ? WILLOW.roles.leader : WILLOW.roles.participant;
        const addR = await api('PUT', `/api/groups/${groupId}/members/${pid}`, { groupRoleId: roleId });
        if (!addR.ok) {
            return { ok: false, pid, error: `Group add failed: ${JSON.stringify(addR.data?.message)}` };
        }
    }

    // 4. Hannes Gruppenleiter: add to BOTH groups as leader
    if (person.isLeader) {
        // Add to both groups
        for (const gid of [WILLOW.groups.interessenten, WILLOW.groups.getauft]) {
            await api('PUT', `/api/groups/${gid}/members/${pid}`, { groupRoleId: WILLOW.roles.leader });
        }
    }

    return { ok: true, pid };
}

async function main() {
    L('=== Migration: All Persons to Willow ===');
    L(`Started: ${new Date().toISOString()}\n`);

    // Login
    const login = await api('POST', '/api/login', { username: USERNAME, password: PASSWORD });
    if (!login.ok) { L('❌ Login failed'); writeFileSync('scripts/migration-output.txt', log.join('\n'), 'utf8'); return; }
    L('✅ Logged in\n');

    // Parse CSV
    const csvPath = 'docs/2026-02-10_people(FULL).csv';
    const allPersons = parseCSV(csvPath);
    L(`📋 Parsed ${allPersons.length} persons from CSV`);

    // Filter: skip Dora Becker (already mirrored) and Stefan Schödel (admin)
    const toMigrate = allPersons.filter(p => {
        if (p.firstName === 'Dora' && p.lastName === 'Becker') return false;
        if (p.lastName === 'Schödel' || p.lastName === 'Schoedel') return false;
        return true;
    });
    L(`📋 ${toMigrate.length} persons to migrate (excluding Dora Becker and Stefan Schödel)\n`);

    // Mark Hannes Gruppenleiter as leader
    const hannes = toMigrate.find(p => p.firstName === 'Hannes' && p.lastName === 'Gruppenleiter');
    if (hannes) {
        hannes.isLeader = true;
        L('👤 Hannes Gruppenleiter will be added as LEADER of both groups');
    }

    // Migrate!
    let success = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < toMigrate.length; i++) {
        const p = toMigrate[i];
        const label = `${p.firstName} ${p.lastName}`;
        const groupLabel = p.isLeader ? '(LEADER both)' : p.group ? `(${p.group})` : '(no group)';

        try {
            const result = await createPerson(p);
            if (result.ok) {
                L(`  ✅ [${i + 1}/${toMigrate.length}] ${label} → ID: ${result.pid} ${groupLabel}`);
                success++;
            } else {
                L(`  ❌ [${i + 1}/${toMigrate.length}] ${label}: ${result.error}`);
                errors.push({ name: label, error: result.error });
                failed++;
            }
        } catch (e) {
            L(`  ❌ [${i + 1}/${toMigrate.length}] ${label}: EXCEPTION: ${e.message}`);
            errors.push({ name: label, error: e.message });
            failed++;
        }

        // Small delay to avoid rate limiting
        if (i % 10 === 9) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    L(`\n========================================`);
    L(`=== MIGRATION COMPLETE ===`);
    L(`========================================`);
    L(`✅ Success: ${success}`);
    L(`❌ Failed:  ${failed}`);
    L(`📋 Total:   ${toMigrate.length}`);

    if (errors.length > 0) {
        L(`\nErrors:`);
        for (const e of errors) {
            L(`  - ${e.name}: ${e.error}`);
        }
    }

    L(`\nFinished: ${new Date().toISOString()}`);
    writeFileSync('scripts/migration-output.txt', log.join('\n'), 'utf8');
    console.log(`Done! ${success} success, ${failed} failed. See scripts/migration-output.txt`);
}

main().catch(e => { L('FATAL:', e.message); writeFileSync('scripts/migration-output.txt', log.join('\n'), 'utf8'); });
