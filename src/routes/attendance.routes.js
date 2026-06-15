const router = require("express").Router();
const ctrl = require("../controllers/attendance.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /attendance/report/class/{classId}:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get attendance report for a specific class
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: classId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance report for the class
 */
router.get(
  "/report/class/:classId",
  authorize("MANAGER", "PROFESSOR", "ASSISTANT"),
  ctrl.classReport,
);

/**
 * @swagger
 * /attendance/:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get all attendance records
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all attendance records
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /attendance/:
 *   post:
 *     tags:
 *       - Attendance
 *     summary: Mark attendance for a single student
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created attendance record
 */
router.post("/", authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.markOne);

/**
 * @swagger
 * /attendance/bulk:
 *   post:
 *     tags:
 *       - Attendance
 *     summary: Mark attendance for multiple students at once
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       201:
 *         description: Result of bulk operation
 */
router.post(
  "/bulk",
  authorize("PROFESSOR", "ASSISTANT", "MANAGER"),
  ctrl.markBulk,
);

/**
 * @swagger
 * /attendance/{id}:
 *   put:
 *     tags:
 *       - Attendance
 *     summary: Update an attendance record
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated attendance record
 */
router.put("/:id", authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.update);

/**
 * @swagger
 * /attendance/{id}:
 *   delete:
 *     tags:
 *       - Attendance
 *     summary: Delete an attendance record
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deletion confirmation
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
