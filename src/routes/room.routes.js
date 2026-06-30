const router = require("express").Router();
const ctrl = require("../controllers/room.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: Get all rooms
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of rooms
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /rooms:
 *   post:
 *     tags: [Rooms]
 *     summary: Create a room
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     tags: [Rooms]
 *     summary: Update a room
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
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Room updated
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     tags: [Rooms]
 *     summary: Delete a room
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
 *         description: Room deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
