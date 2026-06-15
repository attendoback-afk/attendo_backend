const router = require("express").Router();
const ctrl = require("../controllers/department.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /departments/:
 *   get:
 *     tags:
 *       - Departments
 *     summary: Get all departments
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all departments
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     tags:
 *       - Departments
 *     summary: Get a specific department by ID
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
 *         description: Department data
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /departments/:
 *   post:
 *     tags:
 *       - Departments
 *     summary: Create a new department
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
 *     responses:
 *       201:
 *         description: Created department
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     tags:
 *       - Departments
 *     summary: Update a department
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
 *         description: Updated department
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     tags:
 *       - Departments
 *     summary: Delete a department
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
