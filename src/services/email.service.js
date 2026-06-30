const nodemailer = require("nodemailer");

const smtpHost = process.env.EMAIL_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.EMAIL_PORT || 587);
const smtpSecure =
  process.env.EMAIL_SECURE !== undefined
    ? process.env.EMAIL_SECURE === "1" || process.env.EMAIL_SECURE === "true"
    : smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 15000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 15000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 15000),
  tls: {
    rejectUnauthorized: false,
  },
});

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

async function sendMail({ to, subject, html, text }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
    text,
  });
}

async function sendOTPEmail(to, otp) {
  try {
    await sendMail({
      to,
      subject: "Attendo - Email Verification Code",
      html: buildHtmlBody({
        title: "Attendo 📚",
        intro: "Your verification code is:",
        otp,
      }),
      text: `Your verification code is: ${otp}`,
    });
    console.log(`[SUCCESS] OTP email sent to: ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send email to ${to}:`, error.message);
    console.error("[ERROR] SMTP details:", {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
    });
    if (process.env.NODE_ENV === "production") {
      throw new Error(error?.message || "Failed to send email");
    }
    console.log(`[DEV MODE] Continuing without sending email. OTP is: ${otp}`);
  }
}

async function sendPasswordResetEmail(to, otp) {
  try {
    await sendMail({
      to,
      subject: "Attendo - Password Reset Code",
      html: buildHtmlBody({
        title: "Attendo 🔐",
        intro: "Your password reset code is:",
        otp,
      }),
      text: `Your password reset code is: ${otp}`,
    });
    console.log(`[SUCCESS] Password reset email sent to: ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send password reset email to ${to}:`, error.message);
    console.error("[ERROR] SMTP details:", {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
    });
    if (process.env.NODE_ENV === "production") {
      throw new Error(error?.message || "Failed to send email");
    }
    console.log(`[DEV MODE] Continuing without sending email. OTP is: ${otp}`);
  }
}

async function sendTestEmail({ to, subject, html, text }) {
  await sendMail({
    to,
    subject,
    html,
    text,
  });
}

async function verifyEmailTransport() {
  await transporter.verify();
  return {
    success: true,
    provider: "smtp",
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: process.env.EMAIL_USER,
  };
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendTestEmail,
  verifyEmailTransport,
};
