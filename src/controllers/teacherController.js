import pool from "../../config/db.js";
import defaulterService from "../services/defaulterService.js";
import notificationService from "../services/notificationService.js";
import {
  getMappedStudents,
  createAttendanceSession,
  finalizeAttendanceSession,
  getTeacherStats,
  logAttendanceToAggregate,
} from "../services/attendanceService.js";

function buildActivityPayload(action, teacherId, meta = {}) {
  return pool.query(
    `INSERT INTO activity_logs (actor_role, actor_id, action, details, created_at) 
     VALUES ('teacher', ?, ?, ?, NOW())`,
    [teacherId, action, JSON.stringify(meta)]
  );
}

export async function teacherDashboard(req, res, next) {
  try {
    const teacherId = req.session.user.id;

    // Get teacher details including subject and stream
    const [teacher] = await pool.query(
      `SELECT teacher_id, name, subject, stream
       FROM teacher_details_db
       WHERE teacher_id = ?`,
      [teacherId]
    );

    const teacherInfo = teacher?.[0] || {};
    const stats = await getTeacherStats(teacherId);

    // Get streams, years, semesters, and divisions assigned to this teacher only
    const [teacherAssignments] = await pool.query(
      `SELECT DISTINCT stream, year, semester, division 
       FROM teacher_details_db 
       WHERE teacher_id = ?
       ORDER BY stream, year, semester`,
      [teacherId]
    );

    // Extract unique values for each field
    const uniqueStreams = [...new Set(teacherAssignments.map(a => a.stream))];
    const uniqueYears = [...new Set(teacherAssignments.map(a => a.year))];
    const uniqueSemesters = [...new Set(teacherAssignments.map(a => a.semester))];

    // Split comma-separated divisions and get unique values
    const uniqueDivisions = [...new Set(
      teacherAssignments
        .map(a => a.division)
        .flatMap(div => div.split(',').map(d => d.trim().toUpperCase()))
        .filter(d => d.length > 0)
    )].sort();

    return res.json({
      ...stats,
      teacherInfo: {
        id: teacherInfo.teacher_id,
        name: teacherInfo.name,
        subject: teacherInfo.subject,
        stream: teacherInfo.stream,
      },
      streams: uniqueStreams,
      years: uniqueYears,
      semesters: uniqueSemesters,
      divisions: uniqueDivisions,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getStreamsAndDivisions(req, res, next) {
  try {
    // Get distinct streams from student records
    const [streamsList] = await pool.query(
      `SELECT DISTINCT stream FROM student_details_db 
       WHERE stream IS NOT NULL AND stream != ''
       ORDER BY stream`
    );

    // Get distinct divisions from student records
    const [divisionsList] = await pool.query(
      `SELECT DISTINCT division FROM student_details_db 
       WHERE division IS NOT NULL AND division != ''
       ORDER BY division`
    );

    // Split comma-separated divisions and get unique values
    const uniqueDivisions = [...new Set(
      divisionsList
        .map(d => d.division)
        .flatMap(div => div.split(',').map(d => d.trim().toUpperCase()))
        .filter(d => d.length > 0)
    )].sort();

    return res.json({
      streams: streamsList.map(s => s.stream),
      divisions: uniqueDivisions,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSubjectsForClass(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const { year, stream, division, semester } = req.query;

    if (!year || !stream || !division) {
      return res.status(400).json({
        message: "Year, stream, and division are required",
      });
    }

    // Convert semester to database format (e.g., "1" -> "Sem 1")
    const semesterFilter = semester ? `Sem ${semester}` : null;

    // Get subjects taught by this teacher for the specific year/stream/division/semester
    // Split comma-separated divisions to match individual divisions
    const [subjects] = await pool.query(
      `SELECT DISTINCT subject
       FROM teacher_details_db
       WHERE teacher_id = ?
       AND year = ?
       AND stream = ?
       AND (
         division = ? 
         OR FIND_IN_SET(?, REPLACE(division, ' ', ''))
       )
       ${semester ? 'AND semester = ?' : ''}
       ORDER BY subject`,
      semester
        ? [teacherId, year, stream, division, division, semesterFilter]
        : [teacherId, year, stream, division, division]
    );

    return res.json({
      subjects: subjects.map(s => s.subject),
    });
  } catch (error) {
    return next(error);
  }
}

export async function mappedStudents(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const students = await getMappedStudents(teacherId);
    return res.json({ students });
  } catch (error) {
    return next(error);
  }
}

export async function startAttendance(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const { subject, year, semester, division, stream } = req.body;

    if (!subject || !year || !semester || !division || !stream) {
      return res
        .status(400)
        .json({ message: "Subject, year, semester, division, and stream are required" });
    }

    const students = await getMappedStudents(teacherId);
    if (!students.length) {
      return res
        .status(404)
        .json({ message: "No students mapped to this teacher yet" });
    }

    const sessionId = await createAttendanceSession({
      teacherId,
      subject,
      year,
      semester,
      division,
      stream,
    });

    await buildActivityPayload("START_ATTENDANCE", teacherId, {
      sessionId,
      subject,
      year,
      semester,
      division,
      stream,
    });

    return res.json({
      message: "Attendance session started",
      sessionId,
      students,
    });
  } catch (error) {
    return next(error);
  }
}

export async function endAttendance(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const { sessionId, subject, year, semester, stream, division, attendance } = req.body;

    if (!sessionId || !Array.isArray(attendance) || !attendance.length) {
      return res
        .status(400)
        .json({ message: "Session ID and attendance list are required" });
    }

    const formatted = attendance.map((item) => ({
      studentId: item.studentId,
      status: item.status === "P" ? "P" : "A",
    }));

    const summary = await finalizeAttendanceSession(
      sessionId,
      teacherId,
      formatted
    );

    await logAttendanceToAggregate(formatted, {
      sessionId,
      teacherId,
      subject,
      year,
      semester,
      stream,
      division,
      sessionDate: new Date(),
    });

    await buildActivityPayload("END_ATTENDANCE", teacherId, {
      sessionId,
      subject,
      year,
      division,
      stream,
      present: summary.present,
      absent: summary.absent,
    });

    // Get teacher name for Excel file
    const [teacherInfo] = await pool.query(
      `SELECT name FROM teacher_details_db WHERE teacher_id = ?`,
      [teacherId]
    );
    const teacherName = teacherInfo?.[0]?.name || "Teacher";

    // Save session to attendance_backup table for history with Excel file
    const startedAt = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const datePart = `${pad(startedAt.getDate())}-${pad(startedAt.getMonth() + 1)}-${startedAt.getFullYear()}`;
    const timePart = `${pad(startedAt.getHours())}-${pad(startedAt.getMinutes())}-${pad(startedAt.getSeconds())}`;
    const subjectPart = (subject || "session").replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "_");
    const filename = `${datePart}_${timePart}_${subjectPart}_attendance_record.xlsx`;

    // Get student details for records
    const studentIds = formatted.map(f => f.studentId);
    const placeholders = studentIds.map(() => '?').join(',');
    const [students] = await pool.query(
      `SELECT student_id, student_name, roll_no FROM student_details_db WHERE student_id IN (${placeholders}) ORDER BY student_id ASC`,
      studentIds
    );

    // Build records array with student details in ascending order by roll number
    const studentRecords = students.map(student => {
      const attendanceItem = formatted.find(item => item.studentId === student.student_id);
      return {
        rollNo: student.roll_no || '',
        studentId: student.student_id,
        name: student.student_name || 'Unknown',
        status: attendanceItem?.status || 'A'
      };
    });

    // Generate Excel file
    const XLSX = await import("xlsx-js-style");
    const wb = XLSX.default.utils.book_new();
    const data = [];

    // College header - Row 1
    data.push([
      "Sheth N.K.T.T. College of Commerce & Sheth J.T.T. College of Arts (Autonomous) Thane West - 400601",
    ]);
    data.push([]); // Row 2 - Empty

    // Session metadata - Row 3
    data.push(["Attendance Report"]);
    data.push([]); // Row 4 - Empty
    data.push(["Session ID:", sessionId || ""]); // Row 5
    data.push(["Subject:", subject || ""]); // Row 6
    data.push(["Stream:", stream || ""]); // Row 7
    data.push(["Division:", division || ""]); // Row 8
    data.push(["Teacher:", teacherName]); // Row 9
    data.push(["Date & Time:", startedAt.toLocaleString()]); // Row 10
    data.push(["Present:", summary.present || 0]); // Row 11
    data.push(["Absent:", summary.absent || 0]); // Row 12
    data.push([]); // Row 13 - Empty

    // Student attendance header - Row 14
    data.push(["Roll No", "Student ID", "Name", "Status"]);

    // Student rows - Starting from Row 15
    studentRecords.forEach((student) => {
      data.push([
        student.rollNo || "",
        student.studentId || "",
        student.name || "",
        student.status === "P" ? "Present" : "Absent",
      ]);
    });

    // Create worksheet
    const ws = XLSX.default.utils.aoa_to_sheet(data);

    // Set column widths - increased to accommodate full college name
    ws["!cols"] = [
      { wch: 15 },
      { wch: 18 },
      { wch: 35 },
      { wch: 15 },
    ];

    // Merge cells
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Merge A1:D1 for college name
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Merge A3:D3 for "Attendance Report"
    ];

    // Apply styling with text wrapping for college name (Row 1)
    if (ws["A1"]) {
      ws["A1"].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      };
    }

    // Attendance Report styling (Row 3)
    if (ws["A3"]) {
      ws["A3"].s = {
        font: { bold: true, sz: 12 },
        alignment: { horizontal: "center" },
      };
    }

    // Header row styling (Row 14)
    ["A14", "B14", "C14", "D14"].forEach((cellRef) => {
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } },
          alignment: { horizontal: "center" },
        };
      }
    });

    // Color code student rows - students start from Row 15
    studentRecords.forEach((student, idx) => {
      const rowNum = 15 + idx; // Excel rows start from 15 for first student
      const isPresent = student.status === "P";
      const bgColor = isPresent ? "90EE90" : "FFB6C1"; // Light green for Present, Light pink for Absent

      ["A", "B", "C", "D"].forEach((col) => {
        const cellRef = col + rowNum;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: col === "C" ? "left" : "center" },
          };
        }
      });
    });

    XLSX.default.utils.book_append_sheet(wb, ws, "Attendance");

    // Generate buffer and convert to base64 for storage
    const excelBuffer = XLSX.default.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });
    const fileContent = excelBuffer.toString('base64');

    // Save to database with file content
    await pool.query(
      `INSERT INTO attendance_backup 
        (filename, session_id, teacher_id, subject, year, semester, stream, division, started_at, records, file_content, saved_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [filename, sessionId, teacherId, subject, year, semester, stream, division, startedAt, JSON.stringify(studentRecords), fileContent]
    );

    // Send real-time notification
    notificationService.notifyAttendanceMarked({
      teacherId,
      teacherName,
      subject,
      year,
      stream,
      division,
      present: summary.present,
      absent: summary.absent,
      total: summary.present + summary.absent,
      sessionId
    });

    return res.json({
      message: "Attendance recorded",
      summary,
    });
  } catch (error) {
    return next(error);
  }
}

export async function manualAttendance(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const { studentId, status, reason } = req.body;

    if (!studentId || !status) {
      return res
        .status(400)
        .json({ message: "Student ID and status are required" });
    }

    await pool.query(
      `INSERT INTO manual_overrides 
        (teacher_id, student_id, status, reason, timestamp) 
       VALUES (?, ?, ?, ?, NOW())`,
      [teacherId, studentId, status === "P" ? "P" : "A", reason || null]
    );

    await buildActivityPayload("MANUAL_OVERRIDE", teacherId, {
      studentId,
      status,
      reason,
    });

    return res.json({ message: "Manual attendance override saved" });
  } catch (error) {
    return next(error);
  }
}

export async function teacherActivityLog(req, res, next) {
  try {
    const teacherId = req.session.user.id;

    const [rows] = await pool.query(
      `SELECT action, details, created_at
       FROM activity_logs
       WHERE actor_role = 'teacher' AND actor_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [teacherId]
    );

    return res.json({ activity: rows });
  } catch (error) {
    return next(error);
  }
}

export async function saveAttendanceBackup(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const {
      filename,
      fileContent,
      sessionId,
      subject,
      year,
      semester,
      stream,
      division,
      startedAt,
      attendance,
    } = req.body;

    if (!filename) {
      return res.status(400).json({ message: "Filename is required" });
    }

    await pool.query(
      `INSERT INTO attendance_backup 
        (filename, session_id, teacher_id, subject, year, semester, stream, division, started_at, records, file_content, saved_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        filename,
        sessionId || null,
        teacherId,
        subject || null,
        year || null,
        semester || null,
        stream || null,
        division || null,
        startedAt ? new Date(startedAt) : null,
        JSON.stringify(attendance || []),
        fileContent || null,
      ]
    );

    // log backup action
    await buildActivityPayload("BACKUP_ATTENDANCE", teacherId, {
      filename,
      sessionId,
    });

    return res.json({ message: "Backup saved" });
  } catch (error) {
    return next(error);
  }
}

export async function getAttendanceHistory(req, res, next) {
  try {
    const teacherId = req.session.user.id;

    const [rows] = await pool.query(
      `SELECT id, filename, session_id, subject, year, stream, division, started_at, saved_at
       FROM attendance_backup
       WHERE teacher_id = ?
       ORDER BY saved_at DESC
       LIMIT 100`,
      [teacherId]
    );

    return res.json({ history: rows });
  } catch (error) {
    return next(error);
  }
}

export async function downloadAttendanceBackup(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const backupId = req.params.id;

    const [backup] = await pool.query(
      `SELECT filename, file_content 
       FROM attendance_backup 
       WHERE id = ? AND teacher_id = ?`,
      [backupId, teacherId]
    );

    if (!backup || !Array.isArray(backup) || backup.length === 0) {
      return res.status(404).json({ message: "Backup not found" });
    }

    if (!backup[0].file_content) {
      return res.status(404).json({ message: "File content not found" });
    }

    // Decode base64 file content
    const fileBuffer = Buffer.from(backup[0].file_content, 'base64');

    // Set headers for Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${backup[0].filename}"`
    );
    return res.send(fileBuffer);
  } catch (error) {
    return next(error);
  }
}

export async function exportAttendanceExcel(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const {
      sessionId,
      subject,
      year,
      semester,
      stream,
      division,
      startedAt,
      teacherName,
      summary,
      students,
    } = req.body;

    // Import xlsx-js-style for styled Excel files
    const XLSX = await import("xlsx-js-style");

    // Create workbook and worksheet
    const wb = XLSX.default.utils.book_new();

    // Prepare data with college header
    const data = [];

    // College header (row 1)
    data.push([
      "Sheth N.K.T.T. College of Commerce & Sheth J.T.T. College of Arts (Autonomous) Thane West - 400601",
    ]);
    data.push([]); // Empty row

    // Session metadata
    data.push(["Attendance Report"]);
    data.push([]);
    data.push(["Session ID:", sessionId || ""]);
    data.push(["Subject:", subject || ""]);
    data.push(["Year:", year || ""]);
    data.push(["Semester:", semester || ""]);
    data.push(["Stream:", stream || ""]);
    data.push(["Division:", division || ""]);
    data.push(["Teacher:", teacherName || ""]);
    data.push([
      "Date & Time:",
      startedAt ? new Date(startedAt).toLocaleString() : "",
    ]);
    data.push(["Present:", summary?.present || 0]);
    data.push(["Absent:", summary?.absent || 0]);
    data.push([]);

    // Student attendance header (row 13)
    data.push(["Roll No", "Student ID", "Name", "Status"]);

    // Student rows
    if (students && students.length) {
      students.forEach((student) => {
        data.push([
          student.rollNo || "",
          student.studentId || "",
          student.name || "",
          student.status === "P" ? "Present" : "Absent",
        ]);
      });
    }

    // Create worksheet from data
    const ws = XLSX.default.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Roll No
      { wch: 15 }, // Student ID
      { wch: 30 }, // Name
      { wch: 12 }, // Status
    ];

    // Merge cells for header (college name)
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Merge A1:D1 for college name
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Merge A3:D3 for "Attendance Report"
    ];

    // Apply styling to cells
    // College header (A1)
    if (ws["A1"]) {
      ws["A1"].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    // "Attendance Report" header (A3)
    if (ws["A3"]) {
      ws["A3"].s = {
        font: { bold: true, sz: 12 },
        alignment: { horizontal: "center" },
      };
    }

    // Header row for student table (row 13, 0-indexed as row 12)
    const headerRow = 12;
    ["A", "B", "C", "D"].forEach((col) => {
      const cellRef = col + (headerRow + 1);
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } },
          alignment: { horizontal: "center" },
        };
      }
    });

    // Apply color coding to student rows based on status
    const dataStartRow = 13; // Row 14 in 1-indexed (data starts after header)
    if (students && students.length) {
      students.forEach((student, idx) => {
        const rowNum = dataStartRow + idx + 1;

        // Color all cells in the row
        ["A", "B", "C", "D"].forEach((col) => {
          const cellRef = col + rowNum;
          if (ws[cellRef]) {
            const isPresent = student.status === "P";
            // Light green for Present (#90EE90), Light red for Absent (#FFB6C1)
            ws[cellRef].s = {
              fill: {
                fgColor: { rgb: isPresent ? "90EE90" : "FFB6C1" },
              },
            };
          }
        });
      });
    }

    // Add worksheet to workbook
    XLSX.default.utils.book_append_sheet(wb, ws, "Attendance");

    // Generate buffer
    const excelBuffer = XLSX.default.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Generate filename
    const timestamp = new Date(startedAt || Date.now())
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(/[/:]/g, "-")
      .replace(", ", "_");

    const subjectName = (subject || "session").replace(/\s+/g, "_");
    const filename = `${timestamp}_${subjectName}_attendance_record.xlsx`;

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(excelBuffer);
  } catch (error) {
    console.error("Excel export error:", error);
    return next(error);
  }
}

// Teacher Defaulter List Functions

export async function teacherGetDefaulterList(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const { month, year, type = 'monthly', threshold = 75 } = req.query;

    // Get teacher's details to filter by their stream/subject
    const [teacher] = await pool.query(
      `SELECT stream, subject FROM teacher_details_db WHERE teacher_id = ?`,
      [teacherId]
    );

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const { stream, subject } = teacher[0];

    let defaulters;
    if (type === 'overall') {
      defaulters = await defaulterService.getOverallDefaulters({
        stream,
        subject,
        threshold: parseFloat(threshold)
      });
    } else {
      defaulters = await defaulterService.getDefaulterList({
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
        stream,
        subject,
        threshold: parseFloat(threshold)
      });
    }

    return res.json({
      defaulters,
      count: defaulters.length,
      threshold: parseFloat(threshold),
    });
  } catch (error) {
    return next(error);
  }
}

export async function teacherDownloadDefaulterList(req, res, next) {
  try {
    const teacherId = req.session.user.id;
    const { month, year, stream, division, subject, type = 'monthly', threshold = 75 } = req.query;

    // Get teacher's details
    const [teacher] = await pool.query(
      `SELECT stream, subject FROM teacher_details_db WHERE teacher_id = ?`,
      [teacherId]
    );

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const teacherStream = teacher[0].stream;
    const teacherSubject = teacher[0].subject;

    // Use provided filters or fall back to teacher's assigned values
    const filterStream = stream || teacherStream;
    const filterSubject = subject || teacherSubject;

    let defaulters;
    if (type === 'overall') {
      defaulters = await defaulterService.getOverallDefaulters({
        stream: filterStream,
        division,
        year,
        subject: filterSubject,
        threshold: parseFloat(threshold)
      });
    } else {
      defaulters = await defaulterService.getDefaulterList({
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
        stream: filterStream,
        division,
        subject: filterSubject,
        threshold: parseFloat(threshold)
      });
    }

    if (defaulters.length === 0) {
      return res.status(404).json({
        message: 'No defaulters found. This could mean either no students are below the threshold, or no attendance data exists yet.'
      });
    }

    const workbook = await defaulterService.generateDefaulterExcel(defaulters, {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      type,
      threshold: parseFloat(threshold),
    });

    // Save to history
    await defaulterService.saveDefaulterHistory(
      defaulters,
      teacherId,
      'teacher'
    );

    // Log activity
    await buildActivityPayload('DOWNLOAD_DEFAULTER_LIST', teacherId, {
      count: defaulters.length,
      threshold: parseFloat(threshold),
      filters: { month, year, stream: filterStream, division, subject: filterSubject },
    });

    const filename = `Defaulter_List_${threshold}%_${month || 'All'}_${year || new Date().getFullYear()}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return next(error);
  }
}

