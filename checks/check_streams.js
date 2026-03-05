import pool from '../config/db.js';

async function checkStreams() {
    try {
        console.log('=== Checking Stream Data ===\n');

        // Check student streams
        const [studentStreams] = await pool.query(`
            SELECT stream, COUNT(*) as count 
            FROM student_details_db 
            GROUP BY stream 
            ORDER BY stream
        `);
        console.log('Students by Stream:');
        studentStreams.forEach(s => console.log(`  ${s.stream}: ${s.count} students`));

        // Check teacher streams
        const [teacherStreams] = await pool.query(`
            SELECT stream, COUNT(*) as count 
            FROM teacher_details_db 
            GROUP BY stream 
            ORDER BY stream
        `);
        console.log('\nTeachers by Stream:');
        teacherStreams.forEach(t => console.log(`  ${t.stream}: ${t.count} subjects`));

        // Check teacher-student mappings by stream
        const [mappings] = await pool.query(`
            SELECT s.stream, COUNT(DISTINCT m.student_id) as mapped_students
            FROM teacher_student_map m
            INNER JOIN student_details_db s ON m.student_id = s.student_id
            GROUP BY s.stream
            ORDER BY s.stream
        `);
        console.log('\nMapped Students by Stream:');
        if (mappings.length === 0) {
            console.log('  No mappings found!');
        } else {
            mappings.forEach(m => console.log(`  ${m.stream}: ${m.mapped_students} students`));
        }

        // Check unmapped students by stream
        const [unmapped] = await pool.query(`
            SELECT s.stream, COUNT(*) as unmapped_count
            FROM student_details_db s
            LEFT JOIN teacher_student_map m ON s.student_id = m.student_id
            WHERE m.student_id IS NULL
            GROUP BY s.stream
            ORDER BY s.stream
        `);
        console.log('\nUnmapped Students by Stream:');
        if (unmapped.length === 0) {
            console.log('  All students are mapped!');
        } else {
            unmapped.forEach(u => console.log(`  ${u.stream}: ${u.unmapped_count} students`));
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkStreams();
