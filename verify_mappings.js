import pool from './config/db.js';

async function verifyMappings() {
    try {
        console.log('🔍 Verifying student-teacher mappings...\n');

        const [mappings] = await pool.query(`
      SELECT 
        tsm.teacher_id,
        t.name as teacher_name,
        t.subject,
        t.year,
        t.stream,
        t.semester,
        t.division,
        COUNT(tsm.student_id) as student_count
      FROM teacher_student_map tsm
      INNER JOIN teacher_details_db t ON tsm.teacher_id = t.teacher_id
      GROUP BY tsm.teacher_id, t.name, t.subject, t.year, t.stream, t.semester, t.division
      ORDER BY t.name, t.year, t.stream
    `);

        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 TEACHER-STUDENT MAPPING VERIFICATION');
        console.log('═══════════════════════════════════════════════════════\n');

        let totalStudents = 0;

        mappings.forEach(mapping => {
            console.log(`👨‍🏫 ${mapping.teacher_name} (${mapping.teacher_id})`);
            console.log(`   Subject: ${mapping.subject}`);
            console.log(`   Class: ${mapping.year} ${mapping.stream} ${mapping.semester} - Div ${mapping.division}`);
            console.log(`   Students Mapped: ${mapping.student_count}\n`);
            totalStudents += mapping.student_count;
        });

        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Total Mappings: ${totalStudents}`);
        console.log(`✅ Teachers with Mappings: ${mappings.length}`);
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error verifying mappings:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

verifyMappings().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
