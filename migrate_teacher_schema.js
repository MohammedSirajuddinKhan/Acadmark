import pool from "./config/db.js";

async function migrateTeacherSchema() {
    const connection = await pool.getConnection();

    try {
        console.log("🔄 Starting teacher_details_db schema migration...");

        // Check if semester column exists
        const [semesterCheck] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'teacher_details_db' 
        AND COLUMN_NAME = 'semester'
    `);

        if (semesterCheck[0].count === 0) {
            console.log("Adding 'semester' column to teacher_details_db...");
            await connection.query(`
        ALTER TABLE teacher_details_db 
        ADD COLUMN semester VARCHAR(20) AFTER stream
      `);
            console.log("✅ 'semester' column added successfully");
        } else {
            console.log("✓ 'semester' column already exists");
        }

        // Check if division column exists
        const [divisionCheck] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'teacher_details_db' 
        AND COLUMN_NAME = 'division'
    `);

        if (divisionCheck[0].count === 0) {
            console.log("Adding 'division' column to teacher_details_db...");
            await connection.query(`
        ALTER TABLE teacher_details_db 
        ADD COLUMN division VARCHAR(100) AFTER semester
      `);
            console.log("✅ 'division' column added successfully");
        } else {
            console.log("✓ 'division' column already exists");
        }

        console.log("✅ Migration completed successfully!");

    } catch (error) {
        console.error("❌ Migration failed:", error.message);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

// Run migration
migrateTeacherSchema()
    .then(() => {
        console.log("Migration script finished");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Migration script failed:", error);
        process.exit(1);
    });
