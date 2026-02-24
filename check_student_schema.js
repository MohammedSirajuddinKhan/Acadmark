import pool from './config/db.js';

async function checkSchema() {
    try {
        const [columns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'student_details_db' 
      AND TABLE_SCHEMA = 'acadmark_attendance'
      ORDER BY ORDINAL_POSITION
    `);

        console.log('student_details_db columns:');
        columns.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });

        // Show sample data
        const [sample] = await pool.query('SELECT * FROM student_details_db LIMIT 3');
        console.log('\nSample data:');
        sample.forEach((s, i) => {
            console.log(`\nStudent ${i + 1}:`, JSON.stringify(s, null, 2));
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
