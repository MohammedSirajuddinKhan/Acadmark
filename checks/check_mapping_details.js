import pool from '../config/db.js';

async function checkMappingDetails() {
    try {
        console.log('=== Checking Mapping Details ===\n');

        // Check which students are not mapped
        const [unmappedStudents] = await pool.query(`
            SELECT s.student_id, s.student_name, s.year, s.stream, s.division
            FROM student_details_db s
            LEFT JOIN teacher_student_map m ON s.student_id = m.student_id
            WHERE m.student_id IS NULL
            ORDER BY s.year, s.division, s.roll_no
            LIMIT 25
        `);

        console.log('Unmapped Students (sample):');
        if (unmappedStudents.length === 0) {
            console.log('  All students are mapped!');
        } else {
            unmappedStudents.forEach(s =>
                console.log(`  ${s.student_id} - ${s.student_name} (${s.year} ${s.stream} Div ${s.division})`)
            );
        }

        // Check teacher details
        const [teachers] = await pool.query(`
            SELECT teacher_id, name, stream, year, division
            FROM teacher_details_db
            ORDER BY stream, year
        `);

        console.log('\nTeacher Details:');
        teachers.forEach(t =>
            console.log(`  ${t.teacher_id} - ${t.name}: ${t.year || 'ANY'} ${t.stream} Div ${t.division}`)
        );

        // Check sample mappings
        const [sampleMappings] = await pool.query(`
            SELECT t.teacher_id, t.name, t.stream AS t_stream, 
                   s.student_id, s.student_name, s.stream AS s_stream
            FROM teacher_student_map m
            INNER JOIN teacher_details_db t ON m.teacher_id = t.teacher_id
            INNER JOIN student_details_db s ON m.student_id = s.student_id
            LIMIT 10
        `);

        console.log('\nSample Mappings:');
        sampleMappings.forEach(m =>
            console.log(`  Teacher: ${m.teacher_id} (${m.t_stream}) -> Student: ${m.student_id} (${m.s_stream})`)
        );

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkMappingDetails();
