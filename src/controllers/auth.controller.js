const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const { sendOTPEmail } = require("../services/email.service");

// ─── Helper: توليد OTP ───────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Helper: إنشاء JWT ───────────────────────────────────────
function createToken(user, role = null) {
  const secret = process.env.JWT_SECRET || "default_fallback_secret";
  return jwt.sign(
    { userId: user.id, email: user.email, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

// ════════════════════════════════════════════════════════════
// الدوال المحدثة
// ════════════════════════════════════════════════════════════

async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        staff: { include: { role: true } },
        student: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // تحديد الدور بدقة
    const role = user.staff?.role?.name || (user.student ? "STUDENT" : null);

    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role,
      },
    });
  } catch (err) {
    console.error("GetMe Error:", err);
    return res.status(500).json({ success: false, message: "Failed to get current user" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        staff: { include: { role: true } },
        student:{
          select:{
            userId:true,
            faceRegistered:true,
          },
        },
      },
    });

    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (user.invalid) return res.status(403).json({ success: false, message: "Please verify your email first" });

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    // تحديد الدور (المنطق هنا متوافق مع ما يحتاجه الفرونت إند)
    const role = user.staff?.role?.name || (user.student ? "STUDENT" : null);

    const token = createToken(user, role);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role, // هذا الدور الآن سيصل للفرونت إند
        faceRegistered:user.student?.faceRegistered??true,

      },
      needsFaceRegistration:
      role === "STUDENT"&& !user.student?.faceRegistered,
    });
  } catch (err) {
    console.error("Critical Auth Error:", err);
    const isPrismaConnectionIssue =
      err?.name === "PrismaClientInitializationError" ||
      err?.name === "PrismaClientRustPanicError" ||
      err?.code === "P1001" ||
      err?.code === "P1017";

    if (isPrismaConnectionIssue) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable, so login cannot be completed right now",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Login failed internally",
    });
  }
}

// باقي الدوال (register, verifyOTP, resendOTP) تبقى كما هي...
module.exports = {
  register: async (req, res) => res.status(501).json({ success: false, message: "Not implemented" }),
  verifyOTP: async (req, res) => res.status(501).json({ success: false, message: "Not implemented" }),
  resendOTP: async (req, res) => res.status(501).json({ success: false, message: "Not implemented" }),
  login,
  getMe,
};
