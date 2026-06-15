const router = require("express").Router();
const ctrl = require("../controllers/class.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/",     ctrl.getAll);
router.get("/:id",  ctrl.getOne);
router.post("/",    authorize("MANAGER"), ctrl.create);
router.put("/:id",  authorize("MANAGER"), ctrl.update);
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

// Modules في الـ class
router.post("/:id/modules",                 authorize("MANAGER"), ctrl.addModule);
router.delete("/:id/modules/:moduleId",     authorize("MANAGER"), ctrl.removeModule);

module.exports = router;
