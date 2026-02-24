import pool from './config/db.js';

async function checkStudentMapping() {
    try {
        console.log('🔍 Checking student mapping status...\n');

        // Total students
        const [totalStudents] = await pool.query('SELECT COUNT(*) as count FROM student_details_db');
        console.log(`📊 Total students in database: ${totalStudents[0].count}\n`);

        // Mapped students (unique)
        const [mappedStudents] = await pool.query(`
      SELECT COUNT(DISTINCT student_id) as count 
      FROM teacher_student_map
    `);
        console.log(`✅ Students mapped to at least one teacher: ${mappedStudents[0].count}\n`);

        // Unmapped students
        const [unmappedStudents] = await pool.query(`
      SELECT s.student_id, s.student_name, s.year, s.stream, s.division
      FROM student_details_db s
      LEFT JOIN teacher_student_map tsm ON s.student_id = tsm.student_id
      WHERE tsm.student_id IS NULL
      ORDER BY s.stream, s.year, s.division, s.roll_no
    `);

        if (unmappedStudents.length > 0) {
            console.log(`⚠️  Unmapped students: ${unmappedStudents.length}\n`);

            // Group by stream/year/division
            const grouped = {};
            unmappedStudents.forEach(s => {
                const key = `${s.stream} ${s.year} Div ${s.division}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(s.student_name);
            });

            console.log('📋 Unmapped students by class:\n');
            Object.entries(grouped).forEach(([key, students]) => {
                console.log(`   ${key}: ${students.length} students`);
            });
        } else {
            console.log('✅ All students are mapped to teachers!\n');
        }

        // Total mappings (including duplicates where one student has multiple teachers)
        const [totalMappings] = await pool.query('SELECT COUNT(*) as count FROM teacher_student_map');
        console.log(`\n📊 Total teacher-student mappings: ${totalMappings[0].count}`);
        console.log(`   (Some students may have multiple teachers)\n`);

        console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error checking mappings:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

checkStudentMapping().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
