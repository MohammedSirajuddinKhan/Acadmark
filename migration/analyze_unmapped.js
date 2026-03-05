import pool from '../config/db.js';

async function analyzeunmapped() {
    try {
        console.log('=== Analyzing Unmapped Students ===\n');

        // Get unmapped students grouped by year and division
        const [unmapped] = await pool.query(`
            SELECT s.year, s.stream, s.division, COUNT(*) as count
            FROM student_details_db s
            LEFT JOIN teacher_student_map m ON s.student_id = m.student_id
            WHERE m.student_id IS NULL
            GROUP BY s.year, s.stream, s.division
            ORDER BY s.year, s.division
        `);

        console.log('Unmapped Students by Year/Division:');
        unmapped.forEach(u =>
            console.log(`  ${u.year} ${u.stream} Div ${u.division}: ${u.count} students`)
        );

        // Check if there are teachers for these divisions
        console.log('\nTeachers for SY BSCIT:');
        const [teachers] = await pool.query(`
            SELECT teacher_id, name, year, stream, division, subject
            FROM teacher_details_db
            WHERE year = 'SY' AND stream = 'BSCIT'
            ORDER BY division
        `);

        teachers.forEach(t =>
            console.log(`  ${t.teacher_id} - ${t.name}: Div ${t.division} (${t.subject})`)
        );

        // Sample unmapped students
        console.log('\nSample Unmapped Students:');
        const [sampleStudents] = await pool.query(`
            SELECT s.student_id, s.student_name, s.year, s.stream, s.division
            FROM student_details_db s
            LEFT JOIN teacher_student_map m ON s.student_id = m.student_id
            WHERE m.student_id IS NULL
            LIMIT 5
        `);

        sampleStudents.forEach(s =>
            console.log(`  ${s.student_id} - ${s.student_name}: ${s.year} ${s.stream} Div ${s.division}`)
        );

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

analyzeunmapped();
