import pool from "./config/db.js";

async function checkTeacherData() {
    try {
        console.log("Checking teacher data...\n");

        const [teachers] = await pool.query(
            "SELECT teacher_id, name, subject, stream, year, semester, division FROM teacher_details_db LIMIT 5"
        );

        console.log("Sample teacher records:");
        console.table(teachers);

        const [count] = await pool.query(
            "SELECT COUNT(*) as total, SUM(CASE WHEN semester IS NOT NULL AND semester != '' THEN 1 ELSE 0 END) as with_semester, SUM(CASE WHEN division IS NOT NULL AND division != '' THEN 1 ELSE 0 END) as with_division FROM teacher_details_db"
        );

        console.log("\nSummary:");
        console.log(`Total teachers: ${count[0].total}`);
        console.log(`Teachers with semester: ${count[0].with_semester}`);
        console.log(`Teachers with division: ${count[0].with_division}`);

        if (count[0].with_semester === 0 || count[0].with_division === 0) {
            console.log("\n⚠️  Teacher data needs to be re-imported to populate semester and division fields!");
        }

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await pool.end();
    }
}

checkTeacherData();
