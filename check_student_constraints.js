import pool from './config/db.js';

async function checkConstraints() {
    try {
        // Check SHOW CREATE TABLE
        const [createTable] = await pool.query('SHOW CREATE TABLE student_details_db');
        console.log('=== student_details_db SCHEMA ===\n');
        console.log(createTable[0]['Create Table']);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkConstraints();
