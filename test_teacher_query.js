import pool from "./config/db.js";

async function testTeacherQuery() {
    try {
        console.log("Testing teacher info query...\n");

        const query = `
      SELECT 
        t.teacher_id,
        t.name as teacher_name,
        t.subject,
        t.year,
        t.stream,
        t.semester,
        t.division as divisions,
        COUNT(DISTINCT tsm.student_id) as student_count
      FROM teacher_details_db t
      LEFT JOIN teacher_student_map tsm ON t.teacher_id = tsm.teacher_id
      GROUP BY t.teacher_id, t.year, t.stream, t.subject, t.name, t.semester, t.division
      ORDER BY t.name, t.year, t.stream
    `;

        const [teachers] = await pool.query(query);

        console.log("Query results:");
        console.table(teachers);

        console.log("\nJSON output:");
        console.log(JSON.stringify(teachers, null, 2));

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await pool.end();
    }
}

testTeacherQuery();
