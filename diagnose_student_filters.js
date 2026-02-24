import pool from './config/db.js';

async function diagnoseStudentFilters() {
    try {
        console.log('=== DIAGNOSTIC: Student Filter Data ===\n');

        // 1. Check streams available from students
        console.log('1. Available Streams (from students):');
        const [streams] = await pool.query(
            `SELECT DISTINCT stream FROM student_details_db 
       WHERE stream IS NOT NULL AND stream != ''
       ORDER BY stream`
        );
        console.log('  ', streams.map(s => s.stream).join(', '));

        // 2. Check divisions for FY BSCIT
        console.log('\n2. Divisions for FY BSCIT (from students):');
        const [divisions] = await pool.query(
            `SELECT DISTINCT division FROM student_details_db 
       WHERE stream = 'BSCIT' AND year = 'FY'
       AND division IS NOT NULL AND division != ''
       ORDER BY division`
        );
        console.log('  ', divisions.map(d => d.division).join(', '));

        // 3. Test student query (FY BSCIT Div A)
        console.log('\n3. Query students: FY BSCIT Division A');
        const [students] = await pool.query(
            `SELECT student_id, student_name, roll_no, year, stream, division
       FROM student_details_db
       WHERE year = ? AND stream = ? AND division = ?
       ORDER BY roll_no`,
            ['FY', 'BSCIT', 'A']
        );
        console.log(`   Found: ${students.length} students`);
        if (students.length > 0) {
            console.log('   Samples:');
            students.slice(0, 5).forEach(s => {
                console.log(`     ${s.roll_no}. ${s.student_id} - ${s.student_name}`);
            });
        }

        // 4. Test with ALL division
        console.log('\n4. Query students: FY BSCIT ALL divisions');
        const [studentsAll] = await pool.query(
            `SELECT student_id, student_name, roll_no, year, stream, division
       FROM student_details_db
       WHERE year = ? AND stream = ?
       ORDER BY roll_no`,
            ['FY', 'BSCIT']
        );
        console.log(`   Found: ${studentsAll.length} students`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

diagnoseStudentFilters();
