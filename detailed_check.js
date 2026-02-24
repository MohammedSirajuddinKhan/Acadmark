import pool from './config/db.js';

async function detailedCheck() {
    try {
        // Get all students
        const [all] = await pool.query('SELECT student_id, student_name, stream, year, division FROM student_details_db ORDER BY student_id LIMIT 20');
        console.log('First 20 students:');
        all.forEach(s => {
            console.log(`  ID: "${s.student_id}" | Name: ${s.student_name} | Stream: ${s.stream} | Year: ${s.year} | Division: ${s.division}`);
        });

        // Check if there are students from other streams
        const [streams] = await pool.query('SELECT stream, COUNT(*) as count FROM student_details_db GROUP BY stream');
        console.log('\n\nStudents by stream:');
        streams.forEach(s => {
            console.log(`  ${s.stream}: ${s.count}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

detailedCheck();
