import pool from './config/db.js';

async function checkTeachers() {
    try {
        const [count] = await pool.query('SELECT COUNT(*) as count FROM teacher_details_db');
        console.log('Total teachers in database:', count[0].count);

        const [teachers] = await pool.query('SELECT * FROM teacher_details_db ORDER BY teacher_id, subject');
        console.log('\nAll teachers:');
        teachers.forEach(t => {
            console.log(`  ${t.teacher_id} - ${t.name} - ${t.subject} - ${t.stream} ${t.year} Sem ${t.semester} Div ${t.division}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTeachers();
