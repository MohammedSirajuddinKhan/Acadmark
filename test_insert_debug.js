import pool from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const record = {};
        headers.forEach((header, i) => {
            record[header] = values[i] || '';
        });
        return record;
    });
}

async function testInsertWithDebug() {
    try {
        console.log('🧪 Testing student insert with debug...\n');

        const csvPath = path.join(__dirname, 'IMPORT DETAILS', 'students.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV
        const records = parseCSV(csvContent);
        console.log(`Parsed ${records.length} records from CSV\n`);

        // Take first 5 students from each stream
        const testRecords = [
            records[0],  // BSCIT Div A student 1
            records[90], // BSCDS Div A student 1  
            records[180], // BSCAIML Div A student 1
            records[270], // BSCCA Div A student 1
        ];

        console.log('Test records:');
        testRecords.forEach(r => {
            const uniqueId = `${r.Student_ID}_${r.Stream}`;
            console.log(`  ${r.Student_ID} (${r.Stream}) => ${uniqueId}  - ${r.Student_Name}`);
        });

        // Clear and insert
        console.log('\n🗑️  Clearing student_details_db...');
        await pool.query('DELETE FROM student_details_db');

        console.log('✅ Cleared. Now inserting test records...\n');

        for (const record of testRecords) {
            const uniqueId = `${record.Student_ID}_${record.Stream}`;

            console.log(`Inserting: ID="${uniqueId}", Name="${record.Student_Name}", Stream="${record.Stream}"`);

            const result = await pool.query(
                `INSERT INTO student_details_db 
                 (student_id, student_name, roll_no, year, stream, division) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    uniqueId,
                    record.Student_Name,
                    record.Roll_No,
                    record.Year,
                    record.Stream,
                    record.Division
                ]
            );

            console.log(`  ✓ Inserted (affected rows: ${result[0].affectedRows})`);
        }

        // Verify what got inserted
        console.log('\n📋 Checking what actually got inserted...');
        const [inserted] = await pool.query('SELECT student_id, student_name, stream FROM student_details_db ORDER BY student_id');
        console.log(`\nFound ${inserted.length} students in DB:`);
        inserted.forEach(s => {
            console.log(`  "${s.student_id}" - ${s.student_name} (${s.stream})`);
        });

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testInsertWithDebug();
