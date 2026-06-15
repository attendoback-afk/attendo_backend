const router = require("express").Router();
const ctrl = require("../controllers/module.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /modules/:
 *   get:
 *     tags:
 *       - Modules
 *     summary: Get all modules
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all modules
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /modules/{id}:
 *   get:
 *     tags:
 *       - Modules
 *     summary: Get a specific module by ID
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
 *         description: Module data
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /modules/:
 *   post:
 *     tags:
 *       - Modules
 *     summary: Create a new module
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
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created module
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /modules/{id}:
 *   put:
 *     tags:
 *       - Modules
 *     summary: Update a module
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
 *         description: Updated module
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /modules/{id}:
 *   delete:
 *     tags:
 *       - Modules
 *     summary: Delete a module
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
