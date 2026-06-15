const router = require("express").Router();
const ctrl = require("../controllers/staff.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /staff/:
 *   get:
 *     tags:
 *       - Staff
 *     summary: Get all staff members
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all staff members
 */
router.get("/", authorize("MANAGER"), ctrl.getAll);

/**
 * @swagger
 * /staff/{id}:
 *   get:
 *     tags:
 *       - Staff
 *     summary: Get a specific staff member by ID
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
 *         description: Staff member data
 */
router.get("/:id", authorize("MANAGER"), ctrl.getOne);

/**
 * @swagger
 * /staff/:
 *   post:
 *     tags:
 *       - Staff
 *     summary: Create a new staff member
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               departmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created staff member
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /staff/{id}:
 *   put:
 *     tags:
 *       - Staff
 *     summary: Update a staff member
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
 *         description: Updated staff member
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /staff/{id}:
 *   delete:
 *     tags:
 *       - Staff
 *     summary: Delete a staff member
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
