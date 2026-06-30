const Brevo = require("@getbrevo/brevo");

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

const BREVO_API_KEY = requireEnv("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = requireEnv("BREVO_SENDER_EMAIL");
const BREVO_SENDER_NAME = requireEnv("BREVO_SENDER_NAME");

const client = new Brevo.BrevoClient({
  apiKey: BREVO_API_KEY,
});

function buildHtmlBody({ title, intro, code }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #4F46E5;">${title}</h2>
      <p>${intro}</p>
      <h1 style="letter-spacing: 8px; color: #4F46E5;">${code}</h1>
      <p>This code expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
    </div>
  `;
}

function buildSender() {
  return {
    email: BREVO_SENDER_EMAIL,
    name: BREVO_SENDER_NAME,
  };
}

async function sendHtmlEmail({ to, subject, html, text }) {
  const payload = {
    sender: buildSender(),
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  try {
    await client.transactionalEmails.sendTransacEmail(payload);
  } catch (error) {
    const details = {
      code: error?.code,
      statusCode: error?.statusCode || error?.response?.status,
      body: error?.response?.body,
      message: error?.response?.text || error?.message,
    };

    console.error("[Brevo] Email send failed:", details);

    const apiMessage =
      error?.response?.body?.message ||
      error?.response?.text ||
      error?.message ||
      "Failed to send email";

    throw new Error(apiMessage);
  }
}

async function sendOTPEmail(to, otp) {
  await sendHtmlEmail({
    to,
    subject: "Attendo - Email Verification Code",
    html: buildHtmlBody({
      title: "Attendo 📚",
      intro: "Your verification code is:",
      code: otp,
    }),
    text: `Your verification code is: ${otp}`,
  });
  console.log(`[SUCCESS] OTP email sent to: ${to}`);
}

async function sendPasswordResetEmail(to, otp) {
  await sendHtmlEmail({
    to,
    subject: "Attendo - Password Reset Code",
    html: buildHtmlBody({
      title: "Attendo 🔐",
      intro: "Your password reset code is:",
      code: otp,
    }),
    text: `Your password reset code is: ${otp}`,
  });
  console.log(`[SUCCESS] Password reset email sent to: ${to}`);
}

async function sendTestEmail({ to, subject, html, text }) {
  await sendHtmlEmail({
    to,
    subject,
    html,
    text,
  });
}

async function verifyEmailTransport() {
  return {
    success: true,
    provider: "brevo",
    sender: `${BREVO_SENDER_NAME} <${BREVO_SENDER_EMAIL}>`,
    hasApiKey: Boolean(BREVO_API_KEY),
  };
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendTestEmail,
  verifyEmailTransport,
};
