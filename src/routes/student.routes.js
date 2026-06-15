const router = require("express").Router();
const ctrl = require("../controllers/student.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/",     authorize("MANAGER", "PROFESSOR", "ASSISTANT"), ctrl.getAll);
router.get("/:id",  ctrl.getOne);
router.post("/",    authorize("MANAGER"), ctrl.create);
router.put("/:id",  authorize("MANAGER"), ctrl.update);
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

// سجل الحضور للطالب
router.get("/:id/attendance", ctrl.getAttendance);

module.exports = router;
