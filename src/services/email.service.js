const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.EMAIL_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: Number(process.env.EMAIL_SECURE) === 1 || smtpPort === 465,
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

async function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Attendo - Email Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Attendo 📚</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
        <p>This code expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SUCCESS] OTP email sent to: ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send email to ${to}:`, error.message);
    console.error("[ERROR] SMTP details:", {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: smtpPort,
      secure: Number(process.env.EMAIL_SECURE) === 1 || smtpPort === 465,
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
    });
    console.log("=============================================");
    console.log(
      "Please verify the email settings in .env and confirm you are using a Gmail App Password.",
    );
    console.log(`For debugging, the OTP for ${to} is: ${otp}`);
    console.log("=============================================");
    if (process.env.NODE_ENV === "production") {
      throw new Error("Failed to send email");
    }
    console.log(`[DEV MODE] Continuing without sending email. OTP is: ${otp}`);
  }
}

async function verifyEmailTransport() {
  await transporter.verify();
  return {
    success: true,
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: smtpPort,
    secure: Number(process.env.EMAIL_SECURE) === 1 || smtpPort === 465,
    user: process.env.EMAIL_USER,
  };
}

module.exports = { sendOTPEmail, verifyEmailTransport };
