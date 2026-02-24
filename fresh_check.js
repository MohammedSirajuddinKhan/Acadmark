import pool from './config/db.js';

async function freshCheck() {
    try {
        // Get a fresh count
        const [count] = await pool.query('SELECT COUNT(*) as count FROM student_details_db');
        console.log('Student count:', count[0].count);

        // Check if unique IDs exist
        const [withUnderscore] = await pool.query(
            "SELECT student_id, stream FROM student_details_db WHERE student_id LIKE '%\\_%' LIMIT 10"
        );
        console.log('\nStudents with underscore in ID:', withUnderscore.length);
        if (withUnderscore.length > 0) {
            console.log('Samples:');
            withUnderscore.forEach(s => console.log(`  ${s.student_id} - ${s.stream}`));
        }

        // Check without underscore
        const [withoutUnderscore] = await pool.query(
            "SELECT student_id, stream FROM student_details_db WHERE student_id NOT LIKE '%\\_%' LIMIT 10"
        );
        console.log('\nStudents without underscore in ID:', withoutUnderscore.length);
        if (withoutUnderscore.length > 0) {
            console.log('Samples:');
            withoutUnderscore.forEach(s => console.log(`  ${s.student_id} - ${s.stream}`));
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

freshCheck();
