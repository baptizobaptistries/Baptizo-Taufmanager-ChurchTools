import { MockDataProvider } from '../src/services/mock-data-provider.ts';

async function runTest() {
    console.log('--- Starting Mock Data Test ---');
    const provider = new MockDataProvider();

    console.log('1. Fetching Groups...');
    const groups = await provider.getGroups();
    console.log(`   Found ${groups.length} groups.`);
    groups.forEach(g => {
        console.log(`   - Group: ${g.title} (ID: ${g.id}), Members: ${g.members.length}`);
    });

    if (groups.length !== 2) {
        console.error('FAIL: Expected 2 groups.');
        process.exit(1);
    }

    console.log('2. Fetching Specific Group (100)...');
    const group100 = await provider.getGroup(100);
    if (group100 && group100.title === 'Taufinteressenten') {
        console.log('   SUCCESS: Found "Taufinteressenten".');
    } else {
        console.error('FAIL: Could not find group 100.');
        process.exit(1);
    }

    console.log('3. Updating Person (ID: 1)...');
    await provider.updatePersonFields(1, { seminar_besucht_am: '2025-01-01' });

    const updatedGroup = await provider.getGroup(100);
    const person = updatedGroup?.members.find(p => p.id === 1);

    if (person?.fields.seminar_besucht_am === '2025-01-01') {
        console.log('   SUCCESS: Person updated correctly.');
    } else {
        console.error('FAIL: Person update failed.');
        console.log('   Current state:', person?.fields);
        process.exit(1);
    }

    console.log('--- Test Finished Successfully ---');
}

runTest().catch(console.error);
