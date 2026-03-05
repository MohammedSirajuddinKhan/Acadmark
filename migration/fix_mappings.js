import pool from '../config/db.js';

async function fixMappings() {
    try {
        console.log('=== Fixing Teacher-Student Mappings ===\n');

        // Clear existing mappings
        console.log('Clearing existing mappings...');
        await pool.query('DELETE FROM teacher_student_map');
        console.log('✅ Cleared\n');

        // Auto-map students to teachers based on YEAR, STREAM, and DIVISION
        console.log('Creating new mappings based on year, stream, and division...');
        const [result] = await pool.query(`
            INSERT INTO teacher_student_map (teacher_id, student_id)
            SELECT DISTINCT t.teacher_id, s.student_id
            FROM teacher_details_db t
            INNER JOIN student_details_db s 
              ON t.year = s.year 
              AND t.stream = s.stream
              AND FIND_IN_SET(s.division, t.division) > 0
            ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)
        `);

        console.log(`✅ Created ${result.affectedRows} mappings\n`);

        // Verify the results
        const [streamMappings] = await pool.query(`
            SELECT s.stream, COUNT(DISTINCT m.student_id) as mapped_students,
                   COUNT(DISTINCT m.teacher_id) as teachers
            FROM teacher_student_map m
            INNER JOIN student_details_db s ON m.student_id = s.student_id
            GROUP BY s.stream
        `);

        console.log('Mapped Students by Stream:');
        streamMappings.forEach(m =>
            console.log(`  ${m.stream}: ${m.mapped_students} students mapped to ${m.teachers} teachers`)
        );

        // Check if there are still unmapped students
        const [unmapped] = await pool.query(`
            SELECT COUNT(*) as count
            FROM student_details_db s
            LEFT JOIN teacher_student_map m ON s.student_id = m.student_id
            WHERE m.student_id IS NULL
        `);

        console.log(`\nUnmapped students: ${unmapped[0].count}`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

fixMappings();
