// Migration Script: Fix Onboarding Dates in ChurchTools
// Run this once to update all persons' onboarding dates to 2-20 days before seminar

import { churchtoolsClient } from '@churchtools/churchtools-client';
import { getAdminSettings } from '../lib/kv-store';

export async function migrateOnboardingDates(): Promise<{ updated: number; skipped: number; errors: number }> {
    console.log('[Migration] Starting onboarding date migration...');
    console.log('[Migration] ⚠️  TESTING FIELD NAME FIRST...');

    // FIRST: Test if the field exists by trying to read it from one person
    try {
        const testPerson: any = await churchtoolsClient.get(`/persons/1`);
        console.log('[Migration] Test person fields:', {
            taufmanager_onboarding: testPerson.taufmanager_onboarding,
            taufmanager_seminar: testPerson.taufmanager_seminar,
            taufmanager_taufe: testPerson.taufmanager_taufe,
            allFields: Object.keys(testPerson).filter(k => k.startsWith('taufmanager'))
        });
    } catch (e) {
        console.error('[Migration] Could not test field names:', e);
    }

    const adminCfg = await getAdminSettings();
    const interestGroupId = parseInt(adminCfg?.interestGroupId || '0');
    const baptizedGroupId = parseInt(adminCfg?.baptizedGroupId || '0');

    console.log('[Migration] Group IDs:', { interestGroupId, baptizedGroupId });

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Fetch all groups
    const groupIds = [interestGroupId, baptizedGroupId].filter(id => id > 0);

    if (groupIds.length === 0) {
        console.error('[Migration] No group IDs configured!');
        return { updated, skipped, errors };
    }

    for (const groupId of groupIds) {
        console.log(`[Migration] Processing group ${groupId}...`);

        // Fetch group members with pagination - EXACT SAME AS personService.ts
        let allMembers: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                // EXACT API CALL FROM personService.ts (line 45)
                const response: any = await churchtoolsClient.get(`/groups/${groupId}/members?page=${page}`);
                const members: any[] = Array.isArray(response) ? response : (response.data || []);

                if (members.length === 0) {
                    hasMore = false;
                } else {
                    allMembers = allMembers.concat(members);
                    if (members.length < 10) hasMore = false;
                    page++;
                }
            } catch (groupError) {
                console.error(`[Migration] Error fetching group ${groupId} page ${page}:`, groupError);
                hasMore = false;
            }
        }

        console.log(`[Migration] Total members in group ${groupId}: ${allMembers.length}`);

        // Process each member
        for (const m of allMembers) {
            try {
                // Fetch full person details (EXACT SAME AS personService.ts line 75)
                const personDetail: any = await churchtoolsClient.get(`/persons/${m.personId}`);

                const seminarDate = personDetail.taufmanager_seminar;
                const currentOnboarding = personDetail.taufmanager_onboarding;

                console.log(`[Migration] Person ${m.personId} (${personDetail.firstName} ${personDetail.lastName}):`);
                console.log(`  - seminar: ${seminarDate}`);
                console.log(`  - current onboarding: ${currentOnboarding}`);

                // Skip if no seminar date
                if (!seminarDate) {
                    console.log(`[Migration]   → Skipping - no seminar date`);
                    skipped++;
                    continue;
                }

                // Skip if onboarding already set and different from seminar
                if (currentOnboarding && currentOnboarding !== seminarDate) {
                    console.log(`[Migration]   → Skipping - onboarding already customized`);
                    skipped++;
                    continue;
                }

                // Calculate new onboarding date (2-20 days before seminar)
                const seminarDateObj = new Date(seminarDate);
                const daysOffset = 2 + (m.personId % 19); // 2-20 days
                const onboardingDateObj = new Date(seminarDateObj.getTime() - daysOffset * 86400000);
                const newOnboarding = onboardingDateObj.toISOString().split('T')[0];

                console.log(`[Migration]   → WILL UPDATE to: ${newOnboarding} (${daysOffset} days earlier)`);

                // Update person in ChurchTools
                const patchData = {
                    taufmanager_onboarding: newOnboarding
                };

                console.log('[Migration]   → Sending PATCH:', patchData);

                const patchResponse: any = await churchtoolsClient.patch(`/persons/${m.personId}`, patchData);

                console.log('[Migration]   → PATCH response:', patchResponse);

                // READ BACK to verify
                const verifyPerson: any = await churchtoolsClient.get(`/persons/${m.personId}`);
                console.log('[Migration]   → VERIFICATION: taufmanager_onboarding =', verifyPerson.taufmanager_onboarding);

                if (verifyPerson.taufmanager_onboarding === newOnboarding) {
                    console.log(`[Migration]   ✓✓✓ VERIFIED - Data persisted in ChurchTools!`);
                    updated++;
                } else {
                    console.error(`[Migration]   ✗✗✗ FAILED - Data NOT persisted! Field might not exist in ChurchTools custom fields!`);
                    errors++;
                }

            } catch (personError) {
                console.error(`[Migration] Error processing person ${m.personId}:`, personError);
                errors++;
            }
        }
    }

    console.log(`[Migration] ========================================`);
    console.log(`[Migration] Migration Complete!`);
    console.log(`[Migration] ✓ Updated: ${updated}`);
    console.log(`[Migration] ⊘ Skipped: ${skipped}`);
    console.log(`[Migration] ✗ Errors: ${errors}`);
    console.log(`[Migration] ========================================`);

    return { updated, skipped, errors };
}
