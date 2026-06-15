const router = require("express").Router();
const ctrl = require("../controllers/student.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /students/:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get all students
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all students
 */
router.get("/", authorize("MANAGER", "PROFESSOR", "ASSISTANT"), ctrl.getAll);

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get a specific student by ID
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
 *         description: Student data
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /students/:
 *   post:
 *     tags:
 *       - Students
 *     summary: Create a new student
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               studentId:
 *                 type: string
 *               classId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created student
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /students/{id}:
 *   put:
 *     tags:
 *       - Students
 *     summary: Update student information
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
 *         description: Updated student
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /students/{id}:
 *   delete:
 *     tags:
 *       - Students
 *     summary: Delete a student
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

/**
 * @swagger
 * /students/{id}/attendance:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get attendance history for a specific student
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
 *         description: Student's attendance records
 */
router.get("/:id/attendance", ctrl.getAttendance);

module.exports = router;
