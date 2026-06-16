const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_URL = "http://localhost:3000/api";
const TARGET_EMAIL = "attendoback@gmail.com";

async function sendOTPToEmail() {
  try {
    console.log(`\n🚀 Sending OTP to: ${TARGET_EMAIL}\n`);

    // First, delete any existing user/verification for this email to start fresh
    await prisma.emailVerification.deleteMany({
      where: { email: TARGET_EMAIL },
    });
    await prisma.user.deleteMany({ where: { email: TARGET_EMAIL } });

    // Register the user
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      fullName: "Attendo Test 1",
      email: TARGET_EMAIL,
      password: "TestPassword123!",
    });

    if (registerRes.status === 201 && registerRes.data.success) {
      console.log(`✓ User registered successfully`);

      // Get the OTP from database
      const emailVerif = await prisma.emailVerification.findUnique({
        where: { email: TARGET_EMAIL },
      });

      if (emailVerif) {
        console.log(`✓ OTP generated and sent to: ${TARGET_EMAIL}`);
        console.log(`\n═════════════════════════════════════════`);
        console.log(`OTP CODE: ${emailVerif.otp}`);
        console.log(`Expires at: ${emailVerif.expiresAt}`);
        console.log(`═════════════════════════════════════════\n`);

        console.log(`📧 Check your email for the OTP code`);
        console.log(`⏰ The OTP will expire in 10 minutes\n`);
      }
    } else {
      throw new Error(registerRes.data.message);
    }
  } catch (err) {
    console.error(`\n✗ Error: ${err.response?.data?.message || err.message}\n`);
    if (err.message.includes("already registered")) {
      console.log(`💡 This email is already registered.`);
      console.log(`   Use the resend-otp endpoint to send a new OTP.\n`);

      // Try to resend OTP instead
      try {
        const resendRes = await axios.post(`${API_URL}/auth/resend-otp`, {
          email: TARGET_EMAIL,
        });

        if (resendRes.data.success) {
          const emailVerif = await prisma.emailVerification.findUnique({
            where: { email: TARGET_EMAIL },
          });

          console.log(`✓ OTP resent successfully to: ${TARGET_EMAIL}`);
          console.log(`\n═════════════════════════════════════════`);
          console.log(`OTP CODE: ${emailVerif.otp}`);
          console.log(`Expires at: ${emailVerif.expiresAt}`);
          console.log(`═════════════════════════════════════════\n`);
        }
      } catch (resendErr) {
        console.error(
          `Resend failed: ${resendErr.response?.data?.message || resendErr.message}`,
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

sendOTPToEmail();
