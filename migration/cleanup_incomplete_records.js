import pool from '../config/db.js';

async function cleanupIncompleteRecords() {
    try {
        console.log('=== Cleaning Up Incomplete Attendance Records ===\n');

        // First, show what we're about to delete
        const [toDelete] = await pool.query(`
            SELECT COUNT(*) as count
            FROM attendance_records
            WHERE year IS NULL OR stream IS NULL OR division IS NULL OR subject IS NULL
        `);

        console.log(`Found ${toDelete[0].count} incomplete records to delete\n`);

        if (toDelete[0].count === 0) {
            console.log('No incomplete records found. Database is clean!');
            await pool.end();
            return;
        }

        // Delete incomplete records
        const [result] = await pool.query(`
            DELETE FROM attendance_records
            WHERE year IS NULL OR stream IS NULL OR division IS NULL OR subject IS NULL
        `);

        console.log(`✅ Deleted ${result.affectedRows} incomplete records\n`);

        // Verify cleanup
        const [remaining] = await pool.query(`
            SELECT COUNT(*) as count
            FROM attendance_records
            WHERE year IS NULL OR stream IS NULL OR division IS NULL OR subject IS NULL
        `);

        console.log(`Remaining incomplete records: ${remaining[0].count}`);

        const [total] = await pool.query(`
            SELECT COUNT(*) as count FROM attendance_records
        `);
        console.log(`Total attendance records now: ${total[0].count}`);

        console.log('\n✅ Cleanup completed successfully!');

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

cleanupIncompleteRecords();
