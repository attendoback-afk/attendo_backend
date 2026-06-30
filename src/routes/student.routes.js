const faceCtrl = require("../controllers/face.controller");
const upload = require("../middleware/upload");
const router = require("express").Router();
const ctrl = require("../controllers/student.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /students:
 *   get:
 *     tags: [Students]
 *     summary: Get all students
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of students
 */
router.get("/", authorize("MANAGER", "PROFESSOR", "ASSISTANT"), ctrl.getAll);

/**
 * @swagger
 * /students/my-face:
 *   get:
 *     tags: [Students]
 *     summary: Get current student face data
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Student face data
 */
router.get("/my-face", authorize("STUDENT"), faceCtrl.getMyFace);

/**
 * @swagger
 * /students/register-face:
 *   post:
 *     tags: [Students]
 *     summary: Upload a student face image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Face registered
 */
router.post("/register-face", authorize("STUDENT"), upload.single("image"), faceCtrl.registerFace);

/**
 * @swagger
 * /students/register-embedding:
 *   post:
 *     tags: [Students]
 *     summary: Save a student face embedding
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FaceEmbeddingRequest'
 *     responses:
 *       200:
 *         description: Embedding saved
 */
router.post("/register-embedding", authorize("STUDENT"), faceCtrl.registerEmbedding);

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get a student by ID
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
 *         description: Student data
 *       400:
 *         description: Invalid student id
 *       404:
 *         description: Student not found
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /students:
 *   post:
 *     tags: [Students]
 *     summary: Create a student
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudentCreateRequest'
 *     responses:
 *       201:
 *         description: Student created
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /students/{id}:
 *   put:
 *     tags: [Students]
 *     summary: Update a student
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
 *               studentCode:
 *                 type: string
 *               classId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Student updated
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /students/{id}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete a student
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
 *         description: Student deleted
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

/**
 * @swagger
 * /students/{id}/attendance:
 *   get:
 *     tags: [Students]
 *     summary: Get a student's attendance history
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: moduleId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: from
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Attendance history
 */
router.get("/:id/attendance", ctrl.getAttendance);

/**
 * @swagger
 * /students/register-face:
 *   post:
 *     tags: [Students]
 *     summary: Upload a student face image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Face registered
 */
module.exports = router;
