const { Resend } = require("resend");

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom =
  process.env.RESEND_FROM ||
  process.env.EMAIL_FROM ||
  "Attendo <onboarding@resend.dev>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

function buildHtmlBody({ title, intro, otp }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #4F46E5;">${title}</h2>
      <p>${intro}</p>
      <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
      <p>This code expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
    </div>
  `;
}

async function sendResendEmail({ to, otp, subject, title, intro }) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const { error } = await resend.emails.send({
    from: resendFrom,
    to,
    subject,
    html: buildHtmlBody({ title, intro, otp }),
  });

  if (error) {
    throw error;
  }
}

async function sendOTPEmail(to, otp) {
  try {
    await sendResendEmail({
      to,
      otp,
      subject: "Attendo - Email Verification Code",
      title: "Attendo 📚",
      intro: "Your verification code is:",
    });
    console.log(`[SUCCESS] OTP email sent to: ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send email to ${to}:`, error.message);
    console.error("[ERROR] Resend details:", {
      from: resendFrom,
      hasApiKey: Boolean(resendApiKey),
      code: error?.code,
      name: error?.name,
      details: error?.message,
    });
    if (process.env.NODE_ENV === "production") {
      throw new Error("Failed to send email");
    }
    console.log(`[DEV MODE] Continuing without sending email. OTP is: ${otp}`);
  }
}

async function sendPasswordResetEmail(to, otp) {
  try {
    await sendResendEmail({
      to,
      otp,
      subject: "Attendo - Password Reset Code",
      title: "Attendo 🔐",
      intro: "Your password reset code is:",
    });
    console.log(`[SUCCESS] Password reset email sent to: ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send password reset email to ${to}:`, error.message);
    console.error("[ERROR] Resend details:", {
      from: resendFrom,
      hasApiKey: Boolean(resendApiKey),
      code: error?.code,
      name: error?.name,
      details: error?.message,
    });
    if (process.env.NODE_ENV === "production") {
      throw new Error("Failed to send email");
    }
    console.log(`[DEV MODE] Continuing without sending email. OTP is: ${otp}`);
  }
}

async function sendTestEmail({ to, subject, html, text }) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const { error } = await resend.emails.send({
    from: resendFrom,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw error;
  }
}

async function verifyEmailTransport() {
  if (!resend) {
    throw new Error("RESEND_API_KEY is missing");
  }

  return {
    success: true,
    provider: "resend",
    from: resendFrom,
    hasApiKey: Boolean(resendApiKey),
  };
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendTestEmail,
  verifyEmailTransport,
};
