import pool from '../config/db.js';

async function checkAttendanceRecords() {
    try {
        console.log('=== Checking Attendance Records ===\n');

        // Check for records with missing year, stream, or division
        const [incompleteRecords] = await pool.query(`
            SELECT 
                id,
                student_id,
                teacher_id,
                subject,
                year,
                stream,
                division,
                session_date,
                status
            FROM attendance_records
            WHERE year IS NULL OR stream IS NULL OR division IS NULL
            LIMIT 10
        `);

        console.log('Records with missing year/stream/division:');
        if (incompleteRecords.length === 0) {
            console.log('  No incomplete records found!');
        } else {
            incompleteRecords.forEach(r =>
                console.log(`  ID: ${r.id}, Student: ${r.student_id}, Year: ${r.year || 'NULL'}, Stream: ${r.stream || 'NULL'}, Division: ${r.division || 'NULL'}, Subject: ${r.subject || 'NULL'}`)
            );
        }

        // Check total records
        const [total] = await pool.query(`
            SELECT COUNT(*) as count FROM attendance_records
        `);
        console.log(`\nTotal attendance records: ${total[0].count}`);

        // Check records by status
        const [byStatus] = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM attendance_records
            GROUP BY status
        `);
        console.log('\nRecords by status:');
        byStatus.forEach(s => console.log(`  ${s.status}: ${s.count}`));

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkAttendanceRecords();
