const router = require("express").Router();
const ctrl = require("../controllers/liveAttendance.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

// الأستاذ
router.post("/start",       authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.startSession);
router.post("/close",       authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.closeSession);
router.get("/my-sessions",  authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.mySessions);
router.get("/:sessionId/records", authorize("PROFESSOR", "ASSISTANT", "MANAGER"), ctrl.getSessionRecords);

// الطالب
router.post("/join", authorize("STUDENT"), ctrl.joinSession);

module.exports = router;
