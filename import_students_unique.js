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

async function importStudentsWithUniqueIds() {
    try {
        console.log('📚 Importing students with unique IDs...\n');

        const csvPath = path.join(__dirname, 'IMPORT DETAILS', 'students.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV
        const records = parseCSV(csvContent);
        console.log('🗑️  Clearing existing students...');
        await pool.query('DELETE FROM student_details_db');
        console.log('✅ Existing students cleared\n');

        let successCount = 0;
        let errorCount = 0;

        // Import each student with unique ID
        for (const record of records) {
            try {
                // Generate unique student ID: StreamCode + original ID
                // e.g., BSC001_BSCIT, BSC001_BSCDS, etc.
                const uniqueId = `${record.Student_ID}_${record.Stream}`;

                // Debug first few
                if (successCount < 5) {
                    console.log(`  DEBUG: Inserting ID="${uniqueId}" Name="${record.Student_Name}" Stream="${record.Stream}"`);
                }

                await pool.query(
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
                successCount++;

                if (successCount % 50 === 0) {
                    console.log(`✓ Imported ${successCount} students...`);
                }
            } catch (err) {
                errorCount++;
                console.log(`⚠️  Error importing ${record.Student_ID} (${record.Stream}): ${err.message}`);
                console.log(`⚠️  Error importing ${record.Student_ID}: ${err.message}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📊 IMPORT SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Successfully imported: ${successCount} students`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('═══════════════════════════════════════════════════════\n');

        // Verify import
        const [counts] = await pool.query(`
      SELECT stream, year, division, COUNT(*) as count
      FROM student_details_db
      GROUP BY stream, year, division
      ORDER BY stream, year, division
    `);

        console.log('📊 Students by Stream/Year/Division:');
        counts.forEach(row => {
            console.log(`   ${row.stream} ${row.year} Div ${row.division}: ${row.count} students`);
        });

        const [total] = await pool.query('SELECT COUNT(*) as total FROM student_details_db');
        console.log(`\n✅ Total students in database: ${total[0].total}`);
        console.log('\n🎉 Student import completed successfully!');

    } catch (error) {
        console.error('❌ Error importing students:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

importStudentsWithUniqueIds().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
