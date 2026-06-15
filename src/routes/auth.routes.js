const router = require("express").Router();
const { register, verifyOTP, resendOTP, login, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Public routes (مش محتاج token)
router.post("/register",    register);
router.post("/verify-otp",  verifyOTP);
router.post("/resend-otp",  resendOTP);
router.post("/login",       login);

// Protected routes (محتاج token)
router.get("/me", authenticate, getMe);

module.exports = router;
