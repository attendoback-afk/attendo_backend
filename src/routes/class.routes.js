const router = require("express").Router();
const ctrl = require("../controllers/class.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /classes/:
 *   get:
 *     tags:
 *       - Classes
 *     summary: Get all classes
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all classes
 */
router.get("/", ctrl.getAll);

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     tags:
 *       - Classes
 *     summary: Get a specific class by ID
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
 *         description: Class data
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /classes/:
 *   post:
 *     tags:
 *       - Classes
 *     summary: Create a new class
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
 *               departmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created class
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     tags:
 *       - Classes
 *     summary: Update a class
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
 *         description: Updated class
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /classes/{id}:
 *   delete:
 *     tags:
 *       - Classes
 *     summary: Delete a class
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
 * /classes/{id}/modules:
 *   post:
 *     tags:
 *       - Classes
 *     summary: Add a module to a class
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
 *             properties:
 *               moduleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Updated class with modules
 */
router.post("/:id/modules", authorize("MANAGER"), ctrl.addModule);

/**
 * @swagger
 * /classes/{id}/modules/{moduleId}:
 *   delete:
 *     tags:
 *       - Classes
 *     summary: Remove a module from a class
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated class with modules
 */
router.delete(
  "/:id/modules/:moduleId",
  authorize("MANAGER"),
  ctrl.removeModule,
);

module.exports = router;
