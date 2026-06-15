const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_URL = "http://localhost:3000/api";

async function runQA() {
  console.log("🚀 Starting QA Test...");

  try {
    // 1. Create a Department, Class, and Module directly via Prisma to set up the environment
    console.log("📦 Setting up Database entities...");
    const department = await prisma.department.create({
      data: { name: "CS Dept" },
    });
    const cls = await prisma.class.create({
      data: {
        name: "CS101",
        classCode: `C${Date.now()}`,
        departmentId: department.id,
        year: 1,
      },
    });
    const module = await prisma.module.create({
      data: { name: "Programming", code: `P${Date.now()}` },
    });

    const managerRole = await prisma.role.findFirst({
      where: { name: "MANAGER" },
    });
    if (!managerRole)
      throw new Error("MANAGER role not found in DB! Seed didn't run?");

    // 2. Add a Staff member (Manager) directly via Prisma (Bootstrap)
    console.log("👤 Creating Manager...");
    const managerEmail = `manager${Date.now()}@test.com`;
    const bcrypt = require("bcryptjs");
    const hash = await bcrypt.hash("password123", 10);

    const managerUser = await prisma.user.create({
      data: {
        fullName: "Dr. Manager",
        email: managerEmail,
        passwordHash: hash,
        invalid: false,
      },
    });
    await prisma.staffMember.create({
      data: { userId: managerUser.id, roleId: managerRole.id },
    });

    // Login as Manager to get token
    const managerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: managerEmail,
      password: "password123",
    });
    const managerToken = managerLogin.data.token;
    console.log("✅ Manager created and logged in!");

    // 3. Add a Student
    console.log("🧑‍🎓 Creating Student...");
    const studentEmail = `student${Date.now()}@test.com`;
    const studentRes = await axios.post(
      `${API_URL}/students`,
      {
        fullName: "Test Student",
        email: studentEmail,
        password: "password123",
        studentCode: `STU${Date.now()}`,
        classId: cls.id,
      },
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      },
    );
    if (!studentRes.data.success) throw new Error("Failed to create Student");

    // Login as Student to get token
    const studentLogin = await axios.post(`${API_URL}/auth/login`, {
      email: studentEmail,
      password: "password123",
    });
    const studentToken = studentLogin.data.token;
    console.log("✅ Student created and logged in!");

    // 4. Test Live Session as Manager
    console.log("📡 Creating Live Session (Manager)...");
    const startRes = await axios.post(
      `${API_URL}/live/start`,
      {},
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      },
    );
    const sessionId = startRes.data.data.sessionId;
    const secret = startRes.data.data.secret;
    console.log(`✅ Live Session created! Secret: ${secret}`);

    // 5. Test Join Session as Student
    console.log("✋ Joining Live Session (Student)...");
    const joinRes = await axios.post(
      `${API_URL}/live/join`,
      { secret },
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      },
    );
    console.log("✅ Student joined successfully!");

    // 6. Test Close Session as Manager
    console.log("🔒 Closing Live Session (Manager)...");
    const closeRes = await axios.post(
      `${API_URL}/live/close`,
      { sessionId },
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      },
    );
    console.log("✅ Session closed!");

    // 7. Verify Records
    console.log("📊 Fetching Session Records...");
    const recordsRes = await axios.get(`${API_URL}/live/${sessionId}/records`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const totalMarked = recordsRes.data.data.session.totalMarked;
    if (totalMarked !== 1)
      throw new Error(`Expected 1 record, got ${totalMarked}`);
    console.log("✅ Records verified!");

    console.log("🎉 ALL QA TESTS PASSED SUCCESSFULLY! The Backend is PERFECT.");
  } catch (error) {
    console.error("❌ QA TEST FAILED:");
    console.error(error);
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runQA();
