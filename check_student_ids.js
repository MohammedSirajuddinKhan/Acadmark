import pool from './config/db.js';

async function checkStudentIds() {
    try {
        // Check for students with underscore in ID (unique format)
        const [uniqueFormat] = await pool.query(
            "SELECT COUNT(*) as count FROM student_details_db WHERE student_id LIKE '%_%'"
        );
        console.log('Students with unique ID format (contains underscore):', uniqueFormat[0].count);

        // Check for students without underscore (old format)
        const [oldFormat] = await pool.query(
            "SELECT COUNT(*) as count FROM student_details_db WHERE student_id NOT LIKE '%_%'"
        );
        console.log('Students with old ID format (no underscore):', oldFormat[0].count);

        // Sample of each
        const [uniqueSamples] = await pool.query(
            "SELECT student_id, stream FROM student_details_db WHERE student_id LIKE '%_%' LIMIT 5"
        );
        console.log('\nSample unique format IDs:');
        uniqueSamples.forEach(s => console.log(`  ${s.student_id} - ${s.stream}`));

        const [oldSamples] = await pool.query(
            "SELECT student_id, stream FROM student_details_db WHERE student_id NOT LIKE '%_%' LIMIT 5"
        );
        console.log('\nSample old format IDs:');
        oldSamples.forEach(s => console.log(`  ${s.student_id} - ${s.stream}`));

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkStudentIds();
