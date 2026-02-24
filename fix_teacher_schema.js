import pool from './config/db.js';

async function fixTeacherSchema() {
    try {
        console.log('🔧 Fixing teacher_details_db schema...\n');

        // Check current structure
        const [currentData] = await pool.query('SELECT * FROM teacher_details_db');
        console.log(`📊 Current records in teacher_details_db: ${currentData.length}\n`);

        // Backup existing data
        console.log('💾 Backing up existing data...');
        const teachersBackup = currentData;
        console.log(`✅ Backed up ${teachersBackup.length} teacher records\n`);

        // Drop and recreate tables with new schema
        console.log('🗑️  Dropping old tables...');
        await pool.query('SET FOREIGN_KEY_CHECKS=0');
        await pool.query('DROP TABLE IF EXISTS teacher_student_map');
        await pool.query('DROP TABLE IF EXISTS teacher_details_db');
        await pool.query('SET FOREIGN_KEY_CHECKS=1');
        console.log('✅ Old tables dropped\n');

        console.log('🆕 Creating new table with composite primary key...');
        await pool.query(`
      CREATE TABLE teacher_details_db (
        teacher_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        year VARCHAR(10) NOT NULL,
        stream VARCHAR(100) NOT NULL,
        semester VARCHAR(20),
        division VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (teacher_id, subject, year, stream, semester)
      )
    `);
        console.log('✅ New table created with composite key (teacher_id, subject, year, stream, semester)\n');

        // Recreate teacher_student_map table
        console.log('🆕 Recreating teacher_student_map table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_student_map (
        teacher_id VARCHAR(50) NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (teacher_id, student_id),
        FOREIGN KEY (student_id) REFERENCES student_details_db(student_id) ON DELETE CASCADE
      )
    `);
        console.log('✅ teacher_student_map table recreated\n');

        // Restore backed up data
        if (teachersBackup.length > 0) {
            console.log('♻️  Restoring backup data...');
            for (const teacher of teachersBackup) {
                await pool.query(
                    `INSERT INTO teacher_details_db 
           (teacher_id, name, subject, year, stream, semester, division, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        teacher.teacher_id,
                        teacher.name,
                        teacher.subject,
                        teacher.year,
                        teacher.stream,
                        teacher.semester,
                        teacher.division,
                        teacher.created_at,
                        teacher.updated_at
                    ]
                );
            }
            console.log(`✅ Restored ${teachersBackup.length} teacher records\n`);
        }

        // Verify new structure
        const [finalData] = await pool.query('SELECT * FROM teacher_details_db');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 SCHEMA FIX SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Teacher records after fix: ${finalData.length}`);
        console.log(`✅ Schema now supports multiple subjects per teacher`);
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('🎉 Schema fix completed successfully!');
        console.log('\n📝 Next step: Re-import teachers.csv to load all 10 assignments\n');

    } catch (error) {
        console.error('❌ Error fixing schema:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

fixTeacherSchema().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
