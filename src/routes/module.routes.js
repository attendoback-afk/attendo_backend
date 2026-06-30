const router = require("express").Router();
const ctrl = require("../controllers/module.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /modules:
 *   get:
 *     tags: [Modules]
 *     summary: Get all modules
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of modules
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /modules/{id}:
 *   get:
 *     tags: [Modules]
 *     summary: Get a module by ID
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
 *         description: Module data
 *       404:
 *         description: Module not found
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /modules:
 *   post:
 *     tags: [Modules]
 *     summary: Create a module
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Module created
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /modules/{id}:
 *   put:
 *     tags: [Modules]
 *     summary: Update a module
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
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Module updated
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /modules/{id}:
 *   delete:
 *     tags: [Modules]
 *     summary: Delete a module
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
 *         description: Module deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
