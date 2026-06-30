const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const { sendOTPEmail } = require("../services/email.service");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createToken(user, role = null) {
  const secret = process.env.JWT_SECRET || "default_fallback_secret";
  return jwt.sign(
    { userId: user.id, email: user.email, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function getRoleName(rawRole) {
  return typeof rawRole === "string" ? rawRole.trim().toUpperCase() : null;
}

async function createPendingVerification(email) {
  const otp = generateOTP();
  const expiresInMinutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prisma.emailVerification.upsert({
    where: { email },
    update: {
      otp,
      expiresAt,
    },
    create: {
      email,
      otp,
      expiresAt,
    },
  });

  await sendOTPEmail(email, otp);

  return { otp, expiresAt };
}

async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        staff: { include: { role: true } },
        student: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const role = user.staff?.role?.name || user.role || (user.student ? "STUDENT" : null);

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
        student: {
          select: {
            userId: true,
            faceRegistered: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.invalid) {
      return res.status(403).json({ success: false, message: "Please verify your email first" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const role = user.staff?.role?.name || user.role || (user.student ? "STUDENT" : null);
    const token = createToken(user, role);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role,
        faceRegistered: user.student?.faceRegistered ?? true,
      },
      needsFaceRegistration: role === "STUDENT" && !user.student?.faceRegistered,
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

async function register(req, res) {
  try {
    const { fullName, email, password, name, role } = req.body;
    const resolvedName = fullName || name;
    const resolvedRole = getRoleName(role);

    if (!resolvedName || !email || !password || !resolvedRole) {
      return res.status(400).json({
        success: false,
        message: "fullName/name, email, password, and role are required",
      });
    }

    if (!["STUDENT", "PROFESSOR", "ASSISTANT", "MANAGER"].includes(resolvedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: resolvedName,
        email,
        passwordHash,
        invalid: true,
        role: resolvedRole,
      },
    });

    await createPendingVerification(email);

    return res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to email.",
      data: {
        userId: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({
      success: false,
      message: "Registration failed internally",
    });
  }
}

async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const verification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "OTP not found. Please request a new one.",
      });
    }

    if (verification.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (verification.otp !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { invalid: false },
    });

    await prisma.emailVerification.delete({ where: { email } });

    const role = updatedUser.role || null;
    const token = createToken(updatedUser, role);

    return res.json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role,
      },
    });
  } catch (err) {
    console.error("VerifyOTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed internally",
    });
  }
}

async function resendOTP(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.invalid) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    await createPendingVerification(email);

    return res.json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (err) {
    console.error("ResendOTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
}

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  getMe,
};
