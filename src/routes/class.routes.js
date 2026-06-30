const router = require("express").Router();
const ctrl = require("../controllers/class.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /classes:
 *   get:
 *     tags: [Classes]
 *     summary: Get all classes
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of classes
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     tags: [Classes]
 *     summary: Get a class by ID
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
 *         description: Class data
 *       404:
 *         description: Class not found
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /classes:
 *   post:
 *     tags: [Classes]
 *     summary: Create a class
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, classCode, departmentId, year]
 *             properties:
 *               name:
 *                 type: string
 *               classCode:
 *                 type: string
 *               departmentId:
 *                 type: integer
 *               year:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Class created
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     tags: [Classes]
 *     summary: Update a class
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
 *               classCode:
 *                 type: string
 *               departmentId:
 *                 type: integer
 *               year:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Class updated
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /classes/{id}:
 *   delete:
 *     tags: [Classes]
 *     summary: Delete a class
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
 *         description: Class deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

/**
 * @swagger
 * /classes/{id}/modules:
 *   post:
 *     tags: [Classes]
 *     summary: Add a module to a class
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
 *             required: [moduleId]
 *             properties:
 *               moduleId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Module added to class
 */
router.post("/:id/modules", authorize("MANAGER"), ctrl.addModule);

/**
 * @swagger
 * /classes/{id}/modules/{moduleId}:
 *   delete:
 *     tags: [Classes]
 *     summary: Remove a module from a class
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Module removed from class
 */
router.delete("/:id/modules/:moduleId", authorize("MANAGER"), ctrl.removeModule);

module.exports = router;
