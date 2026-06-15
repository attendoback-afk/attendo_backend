const router = require("express").Router();
const ctrl = require("../controllers/session.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /sessions/:
 *   get:
 *     tags:
 *       - Sessions
 *     summary: Get all sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sessions
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     tags:
 *       - Sessions
 *     summary: Get a specific session by ID
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
 *         description: Session data
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /sessions/:
 *   post:
 *     tags:
 *       - Sessions
 *     summary: Create a new session
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
 *               sessionDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Created session
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /sessions/{id}:
 *   put:
 *     tags:
 *       - Sessions
 *     summary: Update a session
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
 *         description: Updated session
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /sessions/{id}:
 *   delete:
 *     tags:
 *       - Sessions
 *     summary: Delete a session
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
