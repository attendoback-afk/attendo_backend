const faceCtrl = require("../controllers/face.controller");
const upload = require("../middleware/upload");
const router = require("express").Router();
const ctrl = require("../controllers/student.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

/**
 * @swagger
 * /students/:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get all students
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all students
 */
router.get("/", authorize("MANAGER", "PROFESSOR", "ASSISTANT"), ctrl.getAll);

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get a specific student by ID
 *     security:
 *       - BearerAuth: []
 */
router.get("/:id", ctrl.getOne);

/**
 * @swagger
 * /students/:
 *   post:
 *     tags:
 *       - Students
 *     summary: Create a new student
 *     security:
 *       - BearerAuth: []
 */
router.post("/", authorize("MANAGER"), ctrl.create);

/**
 * @swagger
 * /students/{id}:
 *   put:
 *     tags:
 *       - Students
 *     summary: Update student information
 *     security:
 *       - BearerAuth: []
 */
router.put("/:id", authorize("MANAGER"), ctrl.update);

/**
 * @swagger
 * /students/{id}:
 *   delete:
 *     tags:
 *       - Students
 *     summary: Delete a student
 *     security:
 *       - BearerAuth: []
 */
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

/**
 * @swagger
 * /students/{id}/attendance:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get attendance history for a specific student
 *     security:
 *       - BearerAuth: []
 */
router.get("/:id/attendance", ctrl.getAttendance);

/**
 * @swagger
 * /students/register-face:
 *   post:
 *     tags:
 *       - Students
 *     summary: Upload student face image
 *     security:
 *       - BearerAuth: []
 */
router.post(
  "/register-face",
  authorize("STUDENT"),
  upload.single("image"),
  faceCtrl.registerFace
);

/**
 * @swagger
 * /students/register-embedding:
 *   post:
 *     tags:
 *       - Students
 *     summary: Save student face embedding
 *     security:
 *       - BearerAuth: []
 */
router.post(
  "/register-embedding",
  authorize("STUDENT"),
  faceCtrl.registerEmbedding
);

/**
 * @swagger
 * /students/my-face:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get current student face data
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/my-face",
  authorize("STUDENT"),
  faceCtrl.getMyFace
);

module.exports = router;