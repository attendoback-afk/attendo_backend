const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.EMAIL_PORT || 587);
const smtpSecure =
  process.env.EMAIL_SECURE !== undefined
    ? process.env.EMAIL_SECURE === "1" || process.env.EMAIL_SECURE === "true"
    : smtpPort === 465;

const baseTransportOptions = {
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 15000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 15000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 15000),
};

const transporter =
  (process.env.EMAIL_SERVICE || "gmail").toLowerCase() === "gmail"
    ? nodemailer.createTransport({
        service: "gmail",
        secure: smtpSecure,
        auth: baseTransportOptions.auth,
        connectionTimeout: baseTransportOptions.connectionTimeout,
        greetingTimeout: baseTransportOptions.greetingTimeout,
        socketTimeout: baseTransportOptions.socketTimeout,
        tls: {
          rejectUnauthorized: false,
        },
      })
    : nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: smtpPort,
        secure: smtpSecure,
        ...baseTransportOptions,
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

async function sendTemplatedEmail({ to, otp, subject, title, intro }) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html: buildHtmlBody({ title, intro, otp }),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SUCCESS] Email sent to: ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send email to ${to}:`, error.message);
    console.error("[ERROR] SMTP details:", {
      service: (process.env.EMAIL_SERVICE || "gmail").toLowerCase(),
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: smtpPort,
      secure: smtpSecure,
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

async function sendOTPEmail(to, otp) {
  return sendTemplatedEmail({
    to,
    otp,
    subject: "Attendo - Email Verification Code",
    title: "Attendo 📚",
    intro: "Your verification code is:",
  });
}

async function sendPasswordResetEmail(to, otp) {
  return sendTemplatedEmail({
    to,
    otp,
    subject: "Attendo - Password Reset Code",
    title: "Attendo 🔐",
    intro: "Your password reset code is:",
  });
}

async function verifyEmailTransport() {
  await transporter.verify();
  return {
    success: true,
    service: (process.env.EMAIL_SERVICE || "gmail").toLowerCase(),
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: smtpPort,
    secure: smtpSecure,
    user: process.env.EMAIL_USER,
  };
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
  verifyEmailTransport,
};
