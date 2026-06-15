const router = require("express").Router();
const ctrl = require("../controllers/room.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /rooms/:
 *   get:
 *     tags:
 *       - Rooms
 *     summary: Get all rooms
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all rooms
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /rooms/:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Create a new room
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               building:
 *                 type: string
 *               capacity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created room
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     tags:
 *       - Rooms
 *     summary: Update a room
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
 *         description: Updated room
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     tags:
 *       - Rooms
 *     summary: Delete a room
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
