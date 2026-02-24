import pool from './config/db.js';

async function testStudentsInfoQuery() {
    try {
        // Test query 1: FY BSCIT ALL ALL (should show 30 students)
        console.log('=== Test 1: FY BSCIT, ALL Semesters, ALL Divisions ===');
        const year1 = 'FY', stream1 = 'BSCIT', division1 = 'ALL';
        const [students1] = await pool.query(
            `SELECT student_id, student_name, year, stream, division 
       FROM student_details_db 
       WHERE year = ? AND stream = ?
       ORDER BY roll_no`,
            [year1, stream1]
        );
        console.log(`Found ${students1.length} students`);
        if (students1.length > 0) {
            console.log('First 3:', students1.slice(0, 3).map(s => `${s.student_id} - ${s.student_name}`));
        }

        // Test query 2: FY BSCIT Div A (should show 10 students)
        console.log('\n=== Test 2: FY BSCIT, ALL Semesters, Division A ===');
        const division2 = 'A';
        const [students2] = await pool.query(
            `SELECT student_id, student_name, year, stream, division 
       FROM student_details_db 
       WHERE year = ? AND stream = ? AND division = ?
       ORDER BY roll_no`,
            [year1, stream1, division2]
        );
        console.log(`Found ${students2.length} students`);

        // Test query 3: ALL years, BSCDS (should show 90 students)
        console.log('\n=== Test 3: Stream BSCDS (all years) ===');
        const [students3] = await pool.query(
            `SELECT stream, year, division, COUNT(*) as count 
       FROM student_details_db 
       WHERE stream = 'BSCDS'
       GROUP BY stream, year, division`,
            []
        );
        console.log('By class:');
        students3.forEach(s => console.log(`  ${s.stream} ${s.year} Div ${s.division}: ${s.count}`));
        const total3 = students3.reduce((sum, s) => sum + s.count, 0);
        console.log(`Total: ${total3} students`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testStudentsInfoQuery();
