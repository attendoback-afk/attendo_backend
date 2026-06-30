const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendTestEmail,
} = require("../services/email.service");

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

function normalizeEmail(rawEmail) {
  return typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : rawEmail;
}

async function createPendingVerification(email) {
  const normalizedEmail = normalizeEmail(email);
  const otp = generateOTP();
  const expiresInMinutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prisma.emailVerification.upsert({
    where: { email: normalizedEmail },
    update: {
      otp,
      expiresAt,
    },
    create: {
      email: normalizedEmail,
      otp,
      expiresAt,
    },
  });

  // Don't block registration on SMTP latency or outages.
  void sendOTPEmail(normalizedEmail, otp).catch((err) => {
    console.error("OTP email dispatch failed:", err?.message || err);
  });

  return { otp, expiresAt };
}

async function createPasswordResetToken(email) {
  const normalizedEmail = normalizeEmail(email);
  const otp = generateOTP();
  const expiresInMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 10);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prisma.passwordResetToken.upsert({
    where: { email: normalizedEmail },
    update: {
      otp,
      expiresAt,
    },
    create: {
      email: normalizedEmail,
      otp,
      expiresAt,
    },
  });

  void sendPasswordResetEmail(normalizedEmail, otp).catch((err) => {
    console.error("Password reset email dispatch failed:", err?.message || err);
  });

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
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
    const normalizedEmail = normalizeEmail(email);
    const resolvedName = fullName || name;
    const resolvedRole = getRoleName(role);

    if (!resolvedName || !normalizedEmail || !password || !resolvedRole) {
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

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
        email: normalizedEmail,
        passwordHash,
        invalid: true,
        role: resolvedRole,
      },
    });

    await createPendingVerification(normalizedEmail);

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
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const verification = await prisma.emailVerification.findUnique({
      where: { email: normalizedEmail },
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
      where: { email: normalizedEmail },
      data: { invalid: false },
    });

    await prisma.emailVerification.delete({ where: { email: normalizedEmail } });

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
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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

    await createPendingVerification(normalizedEmail);

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

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await createPasswordResetToken(normalizedEmail);

    return res.json({
      success: true,
      message: "Password reset code sent to email",
    });
  } catch (err) {
    console.error("ForgotPassword Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to start password reset",
    });
  }
}

async function verifyPasswordResetOTP(req, res) {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { email: normalizedEmail },
    });

    if (!resetToken) {
      return res.status(404).json({
        success: false,
        message: "Reset code not found. Please request a new one.",
      });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset code expired",
      });
    }

    if (resetToken.otp !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    return res.json({
      success: true,
      message: "Reset code verified successfully",
    });
  } catch (err) {
    console.error("VerifyPasswordResetOTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify reset code",
    });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "email, otp, and newPassword are required",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "newPassword must be at least 8 characters",
      });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { email: normalizedEmail },
    });

    if (!resetToken) {
      return res.status(404).json({
        success: false,
        message: "Reset code not found. Please request a new one.",
      });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset code expired",
      });
    }

    if (resetToken.otp !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.delete({ where: { email: normalizedEmail } });

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("ResetPassword Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
}

async function sendEmailTest(req, res) {
  try {
    const to = normalizeEmail(req.body?.to || req.user?.email);
    const subject = req.body?.subject || "Attendo test email";
    const message = req.body?.message || "This is a one-off test email from Attendo.";

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "to is required",
      });
    }

    await sendTestEmail({
      to,
      subject,
      html: `<div style="font-family: Arial, sans-serif;"><h2>Attendo Test</h2><p>${message}</p></div>`,
      text: message,
    });

    return res.json({
      success: true,
      message: "Test email sent successfully",
      to,
    });
  } catch (err) {
    console.error("SendEmailTest Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send test email",
    });
  }
}

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyPasswordResetOTP,
  resetPassword,
  sendEmailTest,
  login,
  getMe,
};
