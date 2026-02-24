import pool from "./config/db.js";
import { parseTeacherImport } from "./src/services/adminService.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateTeacherData() {
    const connection = await pool.getConnection();

    try {
        console.log("🔄 Updating teacher records with semester and division data...\n");

        // Parse the teacher CSV file
        const csvPath = path.join(__dirname, "IMPORT DETAILS", "teachers.csv");
        const teachers = parseTeacherImport(csvPath);

        console.log(`Found ${teachers.length} teacher records in CSV\n`);

        let updated = 0;

        await connection.beginTransaction();

        // Update each teacher record
        for (const teacher of teachers) {
            const result = await connection.query(
                `UPDATE teacher_details_db 
         SET semester = ?, division = ?
         WHERE teacher_id = ? AND subject = ? AND year = ? AND stream = ?`,
                [
                    teacher.semester?.toString().trim() || "",
                    teacher.division?.toString().trim() || "",
                    teacher.teacherId?.toString().trim() || "",
                    teacher.subject?.toString().trim() || "",
                    teacher.year?.toString().trim() || "",
                    teacher.stream?.toString().trim() || ""
                ]
            );

            if (result[0].affectedRows > 0) {
                updated++;
                console.log(`✓ Updated ${teacher.name} - ${teacher.subject}`);
            }
        }

        await connection.commit();

        console.log(`\n✅ Successfully updated ${updated} teacher records!`);

        // Verify the update
        const [count] = await connection.query(
            `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN semester IS NOT NULL AND semester != '' THEN 1 ELSE 0 END) as with_semester,
        SUM(CASE WHEN division IS NOT NULL AND division != '' THEN 1 ELSE 0 END) as with_division
       FROM teacher_details_db`
        );

        console.log("\nVerification:");
        console.log(`Total teachers: ${count[0].total}`);
        console.log(`Teachers with semester: ${count[0].with_semester}`);
        console.log(`Teachers with division: ${count[0].with_division}`);

    } catch (error) {
        await connection.rollback();
        console.error("❌ Update failed:", error.message);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

updateTeacherData()
    .then(() => {
        console.log("\n✅ Update completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Update failed:", error);
        process.exit(1);
    });
