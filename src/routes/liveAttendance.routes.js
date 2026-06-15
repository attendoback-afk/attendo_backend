const router = require("express").Router();
const ctrl = require("../controllers/liveAttendance.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /live/start:
 *   post:
 *     tags:
 *       - Live Attendance
 *     summary: Start a live attendance session (for instructor)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *               moduleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created live attendance session
 */
router.post(
  "/start",
  authorize("PROFESSOR", "ASSISTANT", "MANAGER"),
  ctrl.startSession,
);

/**
 * @swagger
 * /live/close:
 *   post:
 *     tags:
 *       - Live Attendance
 *     summary: Close an active live attendance session
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Closed session confirmation
 */
router.post(
  "/close",
  authorize("PROFESSOR", "ASSISTANT", "MANAGER"),
  ctrl.closeSession,
);

/**
 * @swagger
 * /live/my-sessions:
 *   get:
 *     tags:
 *       - Live Attendance
 *     summary: Get all live attendance sessions created by current instructor
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of instructor's sessions
 */
router.get(
  "/my-sessions",
  authorize("PROFESSOR", "ASSISTANT", "MANAGER"),
  ctrl.mySessions,
);

/**
 * @swagger
 * /live/{sessionId}/records:
 *   get:
 *     tags:
 *       - Live Attendance
 *     summary: Get attendance records for a specific live session
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance records for the session
 */
router.get(
  "/:sessionId/records",
  authorize("PROFESSOR", "ASSISTANT", "MANAGER"),
  ctrl.getSessionRecords,
);

/**
 * @swagger
 * /live/join:
 *   post:
 *     tags:
 *       - Live Attendance
 *     summary: Join an active live attendance session (for student)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Join confirmation with session details
 */
router.post("/join", authorize("STUDENT"), ctrl.joinSession);

module.exports = router;
