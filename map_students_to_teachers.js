import pool from './config/db.js';

async function mapStudentsToTeachers() {
    try {
        console.log('🔄 Starting student-teacher mapping process...\n');

        // Get all teachers with their year, stream, and division assignments
        const [teachers] = await pool.query(`
      SELECT teacher_id, name, subject, year, stream, semester, division
      FROM teacher_details_db
      ORDER BY teacher_id, year, stream, semester
    `);

        if (teachers.length === 0) {
            console.log('❌ No teachers found in the database.');
            return;
        }

        console.log(`📚 Found ${teachers.length} teacher assignment(s)\n`);

        // Clear existing mappings
        console.log('🗑️  Clearing existing mappings...');
        await pool.query('DELETE FROM teacher_student_map');
        console.log('✅ Existing mappings cleared\n');

        let totalMappings = 0;
        const mappingDetails = [];

        // Process each teacher assignment
        for (const teacher of teachers) {
            // Split comma-separated divisions into individual divisions
            const divisions = teacher.division
                .split(',')
                .map(d => d.trim().toUpperCase())
                .filter(d => d.length > 0);

            console.log(`👨‍🏫 ${teacher.name} (${teacher.teacher_id})`);
            console.log(`   Subject: ${teacher.subject}`);
            console.log(`   Year: ${teacher.year}, Stream: ${teacher.stream}, Semester: ${teacher.semester}`);
            console.log(`   Divisions: ${divisions.join(', ')}`);

            let teacherMappingCount = 0;

            // For each division assigned to this teacher
            for (const division of divisions) {
                // Find students matching year, stream, and division
                const [students] = await pool.query(`
          SELECT student_id, student_name, roll_no, year, stream, division
          FROM student_details_db
          WHERE year = ?
          AND stream = ?
          AND division = ?
          ORDER BY roll_no
        `, [teacher.year, teacher.stream, division]);

                if (students.length > 0) {
                    // Create mappings for each matched student
                    for (const student of students) {
                        try {
                            await pool.query(`
                INSERT IGNORE INTO teacher_student_map (teacher_id, student_id)
                VALUES (?, ?)
              `, [teacher.teacher_id, student.student_id]);

                            teacherMappingCount++;
                            totalMappings++;
                        } catch (err) {
                            console.log(`   ⚠️  Warning: Could not map ${student.student_id} - ${err.message}`);
                        }
                    }

                    console.log(`   ✓ Mapped ${students.length} student(s) from ${teacher.year} ${teacher.stream} Div ${division}`);
                } else {
                    console.log(`   ⚠️  No students found for ${teacher.year} ${teacher.stream} Div ${division}`);
                }
            }

            mappingDetails.push({
                teacher: teacher.name,
                teacher_id: teacher.teacher_id,
                subject: teacher.subject,
                count: teacherMappingCount
            });

            console.log(`   📊 Total: ${teacherMappingCount} mapping(s) for this teacher\n`);
        }

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 MAPPING SUMMARY');
        console.log('═══════════════════════════════════════════════════════\n');

        mappingDetails.forEach(detail => {
            console.log(`${detail.teacher} (${detail.teacher_id}) - ${detail.subject}`);
            console.log(`  └─ ${detail.count} student mapping(s)\n`);
        });

        console.log(`✅ Total mappings created: ${totalMappings}`);
        console.log('\n🎉 Student-teacher mapping completed successfully!');

    } catch (error) {
        console.error('❌ Error mapping students to teachers:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the mapping function
mapStudentsToTeachers().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
