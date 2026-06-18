const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_URL = "http://localhost:3001/api";

// Update these to a real, existing manager/admin account in your DB
const LOGIN_EMAIL = "admin@attendo.test";
const LOGIN_PASSWORD = "Tr0ub4dor&Zx9k";

// Update to a real, existing classId in your DB
const TEST_CLASS_ID = 1;

let authToken = null;
let createdStudentUserId = null;
const TEST_EMAIL = `student.test.${Date.now()}@attendo.test`;
const TEST_STUDENT_CODE = `STU-${Date.now()}`;

function authHeaders() {
  return { headers: { Authorization: `Bearer ${authToken}` } };
}

async function login() {
  console.log(`\n🔑 Logging in as: ${LOGIN_EMAIL}\n`);

  const res = await axios.post(`${API_URL}/auth/login`, {
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });

  if (res.data.success && res.data.token) {
    authToken = res.data.token;
    console.log(`✓ Logged in, token acquired\n`);
  } else {
    throw new Error("Login did not return a token");
  }
}

async function testCreateStudent() {
  console.log(`\n🚀 POST /students - creating student\n`);

  const res = await axios.post(
    `${API_URL}/students`,
    {
      fullName: "Test Student",
      email: TEST_EMAIL,
      password: "TempPass123!",
      studentCode: TEST_STUDENT_CODE,
      classId: TEST_CLASS_ID,
    },
    authHeaders(),
  );

  if (res.status === 201 && res.data.success) {
    createdStudentUserId = res.data.data?.userId;
    console.log(`✓ Student created successfully (userId: ${createdStudentUserId})`);

    if (createdStudentUserId) {
      const dbStudent = await prisma.student.findUnique({
        where: { userId: createdStudentUserId },
      });
      console.log(`✓ Verified in DB:`, dbStudent ? "found" : "NOT FOUND");
    }
  } else {
    throw new Error(res.data.message || "Unexpected response on create");
  }
}

async function testCreateStudentValidationError() {
  console.log(`\n🚀 POST /students - missing fields (expect 400)\n`);

  try {
    await axios.post(`${API_URL}/students`, { fullName: "Incomplete" }, authHeaders());
    console.log(`✗ Expected a 400 but request succeeded`);
  } catch (err) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected with 400: ${err.response.data.message}`);
    } else {
      throw err;
    }
  }
}

async function testGetAllStudents() {
  console.log(`\n🚀 GET /students - listing students\n`);

  const res = await axios.get(`${API_URL}/students`, authHeaders());

  if (res.status === 200 && res.data.success) {
    const count = Array.isArray(res.data.data) ? res.data.data.length : "?";
    console.log(`✓ Fetched student list (count: ${count})`);
  } else {
    throw new Error(res.data.message || "Unexpected response on list");
  }
}

async function testGetStudentById() {
  if (!createdStudentUserId) {
    console.log(`⚠ Skipping GET /students/:id - no student id available`);
    return;
  }

  console.log(`\n🚀 GET /students/${createdStudentUserId} - fetching single student\n`);

  const res = await axios.get(
    `${API_URL}/students/${createdStudentUserId}`,
    authHeaders(),
  );

  if (res.status === 200 && res.data.success) {
    console.log(`✓ Fetched student: ${createdStudentUserId}`);
  } else {
    throw new Error(res.data.message || "Unexpected response on get-by-id");
  }
}

async function testGetStudentByIdNotFound() {
  console.log(`\n🚀 GET /students/999999999 - nonexistent id (expect 404)\n`);

  try {
    await axios.get(`${API_URL}/students/999999999`, authHeaders());
    console.log(`✗ Expected a 404 but request succeeded`);
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`✓ Correctly returned 404`);
    } else {
      throw err;
    }
  }
}

async function testUpdateStudent() {
  if (!createdStudentUserId) {
    console.log(`⚠ Skipping PUT /students/:id - no student id available`);
    return;
  }

  console.log(`\n🚀 PUT /students/${createdStudentUserId} - updating student\n`);

  const newCode = `${TEST_STUDENT_CODE}-updated`;
  const res = await axios.put(
    `${API_URL}/students/${createdStudentUserId}`,
    { studentCode: newCode },
    authHeaders(),
  );

  if (res.status === 200 && res.data.success) {
    console.log(`✓ Student updated successfully`);

    const dbStudent = await prisma.student.findUnique({
      where: { userId: createdStudentUserId },
    });
    console.log(`✓ Verified update in DB - studentCode: ${dbStudent?.studentCode}`);
  } else {
    throw new Error(res.data.message || "Unexpected response on update");
  }
}

async function testGetStudentAttendance() {
  if (!createdStudentUserId) {
    console.log(`⚠ Skipping GET /students/:id/attendance - no student id available`);
    return;
  }

  console.log(`\n🚀 GET /students/${createdStudentUserId}/attendance - fetching attendance\n`);

  const res = await axios.get(
    `${API_URL}/students/${createdStudentUserId}/attendance`,
    authHeaders(),
  );

  if (res.status === 200 && res.data.success) {
    console.log(`✓ Fetched attendance - stats:`, res.data.stats);
  } else {
    throw new Error(res.data.message || "Unexpected response on attendance");
  }
}

async function testGetStudentAttendanceBadDate() {
  if (!createdStudentUserId) {
    console.log(`⚠ Skipping bad-date attendance test - no student id available`);
    return;
  }

  console.log(`\n🚀 GET /students/${createdStudentUserId}/attendance?from=not-a-date (expect 400)\n`);

  try {
    await axios.get(
      `${API_URL}/students/${createdStudentUserId}/attendance?from=not-a-date`,
      authHeaders(),
    );
    console.log(`✗ Expected a 400 but request succeeded`);
  } catch (err) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected with 400: ${err.response.data.message}`);
    } else {
      throw err;
    }
  }
}

async function testDeleteStudent() {
  if (!createdStudentUserId) {
    console.log(`⚠ Skipping DELETE /students/:id - no student id available`);
    return;
  }

  console.log(`\n🚀 DELETE /students/${createdStudentUserId} - deleting student\n`);

  const res = await axios.delete(
    `${API_URL}/students/${createdStudentUserId}`,
    authHeaders(),
  );

  if (res.status === 200 && res.data.success) {
    console.log(`✓ Student deleted successfully`);

    const dbStudent = await prisma.student.findUnique({
      where: { userId: createdStudentUserId },
    });
    console.log(`✓ Verified cascade delete in DB:`, dbStudent ? "STILL EXISTS (bug!)" : "removed");
  } else {
    throw new Error(res.data.message || "Unexpected response on delete");
  }
}

async function runTests() {
  try {
    await login();

    await testCreateStudentValidationError();
    await testCreateStudent();
    await testGetAllStudents();
    await testGetStudentById();
    await testGetStudentByIdNotFound();
    await testUpdateStudent();
    await testGetStudentAttendance();
    await testGetStudentAttendanceBadDate();
    await testDeleteStudent(); // cleans up the test student created above

    console.log(`\n✅ All student endpoint tests completed\n`);
  } catch (err) {
    console.error(
      `\n✗ Error: ${err} ${err.response?.data?.message || err.message}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

runTests();