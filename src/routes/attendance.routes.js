const router = require("express").Router();
const ctrl = require("../controllers/attendance.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

// تقارير
router.get("/report/class/:classId", authorize("MANAGER", "PROFESSOR", "ASSISTANT"), ctrl.classReport);

// CRUD
router.get("/",         ctrl.getAll);
router.post("/",        authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.markOne);
router.post("/bulk",    authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.markBulk);
router.put("/:id",      authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.update);
router.delete("/:id",   authorize("MANAGER"), ctrl.remove);

module.exports = router;
