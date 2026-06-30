const router = require("express").Router();
const ctrl = require("../controllers/department.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /departments:
 *   get:
 *     tags: [Departments]
 *     summary: Get all departments
 *     description: Returns departments with the number of classes in each department.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     tags: [Departments]
 *     summary: Get a department by ID
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
 *         description: Department data
 *       404:
 *         description: Department not found
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /departments:
 *   post:
 *     tags: [Departments]
 *     summary: Create a department
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Department created
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     tags: [Departments]
 *     summary: Update a department
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     tags: [Departments]
 *     summary: Delete a department
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
 *         description: Department deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
