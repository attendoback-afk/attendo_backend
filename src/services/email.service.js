const nodemailer = require("nodemailer");

// إعداد الـ transporter اللي بيبعت الإيميل (يفضل استخدام Gmail App Password)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * بيبعت OTP على إيميل المستخدم
 * @param {string} to - الإيميل اللي هيتبعت له
 * @param {string} otp - الكود المكون من 6 أرقام
 */
async function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || "Attendo <no-reply@attendo.com>",
    to,
    subject: "Attendo - Email Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Attendo 🎓</h2>
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
    console.log('=============================================');
    console.log('يرجى التأكد من إعدادات الإيميل في ملف .env (تأكد أنك تستخدم App Password)');
    console.log(`للضرورة، الـ OTP الخاص بـ ${to} هو: ${otp}`);
    console.log('=============================================');
    // We throw the error so the controller knows it failed, OR we can ignore it if we want to allow testing even if email fails.
    // The user requested real emails to be sent, so if it fails, we MUST throw so they know they need to fix their .env!
    throw new Error("Failed to send email");
  }
}

module.exports = { sendOTPEmail };
