import fetch from 'node-fetch';

async function testEndpoints() {
    const baseUrl = 'http://localhost:3002';

    try {
        console.log('Testing student-streams endpoint...');
        const streamsRes = await fetch(`${baseUrl}/api/admin/student-streams`, {
            headers: { 'Cookie': 'connect.sid=test' } // Mock session
        });
        if (!streamsRes.ok) {
            console.log('❌ Error:', streamsRes.status, streamsRes.statusText);
        } else {
            const streamsData = await streamsRes.json();
            console.log('✅ Streams:', streamsData.streams);
        }

        console.log('\nTesting student-divisions endpoint (FY BSCIT)...');
        const divisionsRes = await fetch(`${baseUrl}/api/admin/student-divisions?stream=BSCIT&year=FY`);
        if (!divisionsRes.ok) {
            console.log('❌ Error:', divisionsRes.status, divisionsRes.statusText);
        } else {
            const divisionsData = await divisionsRes.json();
            console.log('✅ Divisions:', divisionsData.divisions);
        }

        console.log('\nTesting students-info endpoint (FY BSCIT ALL A)...');
        const studentsRes = await fetch(`${baseUrl}/api/admin/students-info?year=FY&stream=BSCIT&semester=ALL&division=A`);
        if (!studentsRes.ok) {
            console.log('❌ Error:', studentsRes.status, studentsRes.statusText);
            const errorText = await studentsRes.text();
            console.log('Error details:', errorText);
        } else {
            const studentsData = await studentsRes.json();
            console.log(`✅ Found ${studentsData.count} students`);
            if (studentsData.students.length > 0) {
                console.log('Sample:', studentsData.students.slice(0, 3).map(s => `${s.student_id} - ${s.student_name}`));
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testEndpoints();
