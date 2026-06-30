const router = require("express").Router();
const ctrl = require("../controllers/attendance.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance records
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: classId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: date
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PRESENT, ABSENT, LATE]
 *     responses:
 *       200:
 *         description: List of attendance records
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /attendance/report/class/{classId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance report for a class
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: classId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: from
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: moduleId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Class attendance report
 */
router.get("/report/class/:classId", authorize("MANAGER", "PROFESSOR", "ASSISTANT"), ctrl.classReport);

/**
 * @swagger
 * /attendance:
 *   post:
 *     tags: [Attendance]
 *     summary: Mark attendance for one student
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, sessionId, date, status]
 *             properties:
 *               studentId:
 *                 type: integer
 *               sessionId:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [PRESENT, ABSENT, LATE]
 *     responses:
 *       201:
 *         description: Attendance marked
 */
router.post("/", authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.markOne);

/**
 * @swagger
 * /attendance/bulk:
 *   post:
 *     tags: [Attendance]
 *     summary: Mark attendance for multiple students
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, date, attendances]
 *             properties:
 *               sessionId:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date-time
 *               attendances:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [studentId, status]
 *                   properties:
 *                     studentId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [PRESENT, ABSENT, LATE]
 *     responses:
 *       201:
 *         description: Bulk attendance result
 */
router.post("/bulk", authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.markBulk);

/**
 * @swagger
 * /attendance/{id}:
 *   put:
 *     tags: [Attendance]
 *     summary: Update an attendance record
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PRESENT, ABSENT, LATE]
 *     responses:
 *       200:
 *         description: Attendance updated
 */
router.put("/:id", authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.update);

/**
 * @swagger
 * /attendance/{id}:
 *   delete:
 *     tags: [Attendance]
 *     summary: Delete an attendance record
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
