const router = require("express").Router();
const ctrl = require("../controllers/staff.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /staff:
 *   get:
 *     tags: [Staff]
 *     summary: Get all staff members
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of staff members
 */
router.get("/", authorize("MANAGER"), ctrl.getAll);

/**
 * @swagger
 * /staff/{id}:
 *   get:
 *     tags: [Staff]
 *     summary: Get a staff member by ID
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
 *         description: Staff data
 *       404:
 *         description: Staff not found
 */
router.get("/:id", authorize("MANAGER"), ctrl.getOne);

/**
 * @swagger
 * /staff:
 *   post:
 *     tags: [Staff]
 *     summary: Create a staff member
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, role]
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [PROFESSOR, ASSISTANT, MANAGER]
 *     responses:
 *       201:
 *         description: Staff created
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /staff/{id}:
 *   put:
 *     tags: [Staff]
 *     summary: Update a staff member role
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [PROFESSOR, ASSISTANT, MANAGER]
 *     responses:
 *       200:
 *         description: Staff updated
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /staff/{id}:
 *   delete:
 *     tags: [Staff]
 *     summary: Delete a staff member
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
 *         description: Staff deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
