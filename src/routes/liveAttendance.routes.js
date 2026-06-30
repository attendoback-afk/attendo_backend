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
 *     summary: Start a live attendance session
 *     description: Creates an active QR-based attendance session for the authenticated staff member. The controller does not consume a request body.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Created live attendance session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveStartResponse'
 *       400:
 *         description: You already have an active session
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Access denied
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
 *     description: Closes the instructor's live session so the QR token can no longer be used.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LiveCloseRequest'
 *     responses:
 *       200:
 *         description: Closed session confirmation
 *       400:
 *         description: Session already closed
 *       403:
 *         description: Not your session
 *       404:
 *         description: Session not found
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
 *     summary: List my live attendance sessions
 *     description: Returns the authenticated instructor's live sessions ordered by newest first.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of instructor's sessions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveSessionsListResponse'
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
 *     description: Returns the attendance record list and session summary for the given live session.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attendance records for the session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveSessionRecordsResponse'
 *       404:
 *         description: Session not found
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
 *     summary: Join an active live attendance session
 *     description: Students submit the active QR secret. The backend validates the active session and records attendance once per student per session.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LiveJoinRequest'
 *     responses:
 *       200:
 *         description: Join confirmation with attendance timestamp
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveJoinResponse'
 *       403:
 *         description: Only students can join sessions
 *       404:
 *         description: Invalid or expired code
 */
router.post("/join", authorize("STUDENT"), ctrl.joinSession);

module.exports = router;
