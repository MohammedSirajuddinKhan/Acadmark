import pool from './config/db.js';

async function countStudents() {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM student_details_db');
        console.log('Total students in student_details_db:', rows[0].count);

        const [samples] = await pool.query('SELECT student_id, student_name, stream, year, division FROM student_details_db LIMIT 10');
        console.log('\nSample students:');
        samples.forEach(s => {
            console.log(`  ${s.student_id} - ${s.student_name} - ${s.stream} ${s.year} Div ${s.division}`);
        });

        const [byStream] = await pool.query('SELECT stream, COUNT(*) as count FROM student_details_db GROUP BY stream ORDER BY stream');
        console.log('\nStudents by stream:');
        byStream.forEach(s => {
            console.log(`  ${s.stream}: ${s.count} students`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

countStudents();
