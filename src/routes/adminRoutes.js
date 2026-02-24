import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

import {
  handleStudentImport,
  handleTeacherImport,
  confirmImport,
  getImportPreview,
  fetchImportActivity,
  fetchDashboardStats,
  downloadTemplate,
  getAttendanceHistory,
  downloadAttendanceBackup,
  deleteAllData,
  clearAttendanceHistory,
  triggerAutoMapping,
  getDefaulterList,
  downloadDefaulterList,
  updateMonthlyAttendance,
  getTeachersInfo,
  getStudentsInfo,
  getStreamsDivisions,
  getTeacherDivisions,
  getStudentDivisions,
  getTeacherStreams,
  getStudentStreams,
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const storage = multer.diskStorage({
  destination: path.join(rootDir, "uploads"),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname || ".xlsx");
    cb(null, `${file.fieldname}-${timestamp}${ext}`);
  },
});

const upload = multer({ storage });

router.use(requireAuth, requireRole("admin"));

router.post("/import/students", upload.single("file"), handleStudentImport);
router.post("/import/teachers", upload.single("file"), handleTeacherImport);
router.post("/import/confirm", confirmImport);
router.get("/import/preview", getImportPreview);
router.get("/activity", fetchImportActivity);
router.get("/stats", fetchDashboardStats);
router.get("/dashboard", fetchDashboardStats);
router.get("/templates/:type", downloadTemplate);
router.get("/attendance/history", getAttendanceHistory);
router.get("/attendance/backup/:id", downloadAttendanceBackup);
router.post("/delete-all-data", deleteAllData);
router.post("/attendance/clear-history", clearAttendanceHistory);
router.post("/auto-map-students", triggerAutoMapping);

// Defaulter management routes
router.get("/defaulters", getDefaulterList);
router.get("/defaulters/download", downloadDefaulterList);

// Teacher and Student information routes
router.get("/teachers-info", getTeachersInfo);
router.get("/students-info", getStudentsInfo);
router.get("/streams-divisions", getStreamsDivisions);
router.get("/teacher-divisions", getTeacherDivisions);
router.get("/student-divisions", getStudentDivisions);
router.get("/teacher-streams", getTeacherStreams);
router.get("/student-streams", getStudentStreams);

// Real-time updates via Server-Sent Events
router.get("/live-updates", (req, res) => {
  notificationService.addConnection(req.session.user.id, "admin", res, req);
});
router.post("/attendance/update-monthly", updateMonthlyAttendance);

export default router;
