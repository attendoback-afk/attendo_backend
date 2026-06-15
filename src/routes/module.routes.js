const router = require("express").Router();
const ctrl = require("../controllers/module.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/",       ctrl.getAll);
router.get("/:id",    ctrl.getOne);
router.post("/",      authorize("MANAGER"), ctrl.create);
router.put("/:id",    authorize("MANAGER"), ctrl.update);
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
