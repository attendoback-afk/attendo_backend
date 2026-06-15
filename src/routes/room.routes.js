const router = require("express").Router();
const ctrl = require("../controllers/room.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/",       ctrl.getAll);
router.post("/",      authorize("MANAGER"), ctrl.create);
router.put("/:id",    authorize("MANAGER"), ctrl.update);
router.delete("/:id", authorize("MANAGER"), ctrl.remove);

module.exports = router;
