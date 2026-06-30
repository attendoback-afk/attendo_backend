const router = require("express").Router();
const ctrl = require("../controllers/session.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: Get all sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: classId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: moduleId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of sessions
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     tags: [Sessions]
 *     summary: Get a session by ID
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
 *         description: Session data
 *       404:
 *         description: Session not found
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /sessions:
 *   post:
 *     tags: [Sessions]
 *     summary: Create a session
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId, moduleId, roomId, dayOfWeek, startTime, endTime]
 *             properties:
 *               classId:
 *                 type: integer
 *               moduleId:
 *                 type: integer
 *               roomId:
 *                 type: integer
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Session created
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /sessions/{id}:
 *   put:
 *     tags: [Sessions]
 *     summary: Update a session
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
 *             properties:
 *               classId:
 *                 type: integer
 *               moduleId:
 *                 type: integer
 *               roomId:
 *                 type: integer
 *               dayOfWeek:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Session updated
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /sessions/{id}:
 *   delete:
 *     tags: [Sessions]
 *     summary: Delete a session
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
 *         description: Session deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
