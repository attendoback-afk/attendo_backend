const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const { sendOTPEmail } = require("../services/email.service");

// ─── Helper: توليد OTP من 6 أرقام ───────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Helper: إنشاء JWT ───────────────────────────────────────
function createToken(user, role = null) {
  return jwt.sign(
    { userId: user.id, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// ════════════════════════════════════════════════════════════
// POST /api/auth/register
// المستخدم بيسجل بإيميل وباسورد
// ════════════════════════════════════════════════════════════
async function register(req, res) {
  try {
    const { fullName, email, password } = req.body;

    // تحقق إن الإيميل مش موجود قبل كده
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // تشفير الباسورد
    const passwordHash = await bcrypt.hash(password, 10);

    // إنشاء المستخدم (invalid = true لحد ما يتأكد بالـ OTP)
    const user = await prisma.user.create({
      data: { fullName, email, passwordHash, invalid: true },
    });

    // إنشاء وإرسال OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

    await prisma.emailVerification.upsert({
      where: { email: user.email },
      update: { otp, expiresAt },
      create: { email: user.email, otp, expiresAt },
    });

    await sendOTPEmail(email, otp);

    res.status(201).json({
      success: true,
      message: "Registered successfully. Check your email for the OTP.",
      userId: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
}

// ════════════════════════════════════════════════════════════
// POST /api/auth/verify-otp
// المستخدم بيدخل الـ OTP عشان يفعّل حسابه
// ════════════════════════════════════════════════════════════
async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;

    const record = await prisma.emailVerification.findUnique({ where: { email } });

    if (!record) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }
    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (new Date() > record.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // تفعيل الحساب (invalid = false) وحذف الـ OTP
    await prisma.user.update({
      where: { email },
      data: { invalid: false },
    });
    await prisma.emailVerification.delete({ where: { email } });

    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
}

// ════════════════════════════════════════════════════════════
// POST /api/auth/resend-otp
// إعادة إرسال OTP
// ════════════════════════════════════════════════════════════
async function resendOTP(req, res) {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.invalid) return res.status(400).json({ success: false, message: "Already verified" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

    await prisma.emailVerification.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt },
    });

    await sendOTPEmail(email, otp);

    res.json({ success: true, message: "OTP resent" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
}

// ════════════════════════════════════════════════════════════
// POST /api/auth/login
// تسجيل دخول وإرجاع JWT
// ════════════════════════════════════════════════════════════
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { 
        staff: { include: { role: true } }, 
        student: true 
      },
    });

    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (user.invalid) return res.status(403).json({ success: false, message: "Please verify your email first" });

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    // تحديد الـ role من الـ staff أو student
    const role = user.staff?.role?.name || (user.student ? "STUDENT" : null);
    const token = createToken(user, role);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
}

// ════════════════════════════════════════════════════════════
// GET /api/auth/me
// بيرجع بيانات المستخدم الحالي
// ════════════════════════════════════════════════════════════
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        staff: { include: { role: true } },
        student: { include: { class: true } },
      },
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get user" });
  }
}

module.exports = { register, verifyOTP, resendOTP, login, getMe };
