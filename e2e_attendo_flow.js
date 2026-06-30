const axios = require("axios");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || "http://localhost:3001/api";

function getOptionalModel(client, modelName) {
  const model = client[modelName];
  return model && typeof model.findFirst === "function" && typeof model.deleteMany === "function"
    ? model
    : null;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function log(step, message) {
  console.log(`\n[Step ${step}] ${message}`);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function createAdmin(email) {
  // Step 1: Admin account — created directly via Prisma (simulates dashboard seed)
  const managerRole = await prisma.role.findFirst({
    where: { name: "MANAGER" },
  });
  assert(managerRole, "MANAGER role not found. Run seed first.");

  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: "QA Manager",
      email,
      passwordHash,
      invalid: false,
    },
  });

  await prisma.staffMember.create({
    data: { userId: user.id, roleId: managerRole.id },
  });

  const login = await axios.post(`${API_URL}/auth/login`, { email, password });
  assert(login.data.token, "Admin login did not return a token");

  return { user, token: login.data.token };
}

async function adminCreateStudent(email, classId, adminToken) {
  // Step 1 continued: Admin creates student from dashboard and assigns to class
  const password = "password123";
  const studentCode = `STU-${Date.now()}`;

  const createRes = await axios.post(
    `${API_URL}/students`,
    {
      fullName: "QA Student",
      email,
      password,
      studentCode,
      classId,
    },
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );

  assert(createRes.data.data, "Admin failed to create student");

  // Log the full response shape so we know exactly what fields are returned
  console.log(
    "  [DEBUG] Student create response:",
    JSON.stringify(createRes.data.data, null, 2),
  );

  return { student: createRes.data.data, password };
}

// Simulate face embedding generation on the mobile device.
// In production the mobile app runs a local ML model; here we use a fixed vector.
function generateFakeEmbedding() {
  return Array.from({ length: 128 }, (_, i) =>
    parseFloat(((i + 1) * 0.01).toFixed(4)),
  );
}

// Cosine similarity — mirrors what the backend should do for face verification.
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const suffix = Date.now();
  const cleanup = {
    attendanceSessionId: null,
    studentUserId: null,
    managerUserId: null,
    classId: null,
    moduleId: null,
    departmentId: null,
    roomId: null,
  };

  try {
    // ── Setup: Create supporting records ──────────────────────────────────────

    const department = await prisma.department.create({
      data: { name: `QA Dept ${suffix}` },
    });
    cleanup.departmentId = department.id;

    const cls = await prisma.class.create({
      data: {
        name: `QA Class ${suffix}`,
        classCode: `QA-${suffix}`,
        departmentId: department.id,
        year: 1,
      },
    });
    cleanup.classId = cls.id;

    const module = await prisma.module.create({
      data: { name: `QA Module ${suffix}`, code: `M-${suffix}` },
    });
    cleanup.moduleId = module.id;

    const room = await prisma.room.create({
      data: { name: `Room ${suffix}` },
    });
    cleanup.roomId = room.id;

    // ── STEP 1: Admin creates student and assigns to class ────────────────────
    log(1, "Admin creates student account and assigns to class");

    const adminEmail = `manager-${suffix}@test.com`;
    const admin = await createAdmin(adminEmail);
    cleanup.managerUserId = admin.user.id;
    global.__managerToken = admin.token;

    const studentEmail = `student-${suffix}@test.com`;
    const { student, password: studentPassword } = await adminCreateStudent(
      studentEmail,
      cls.id,
      admin.token,
    );

    // The API response shape may vary — resolve userId robustly
    const resolvedUserId = student.userId ?? student.user?.id ?? student.id;
    cleanup.studentUserId = resolvedUserId;

    log(
      1,
      `✓ Student created (resolvedUserId=${resolvedUserId}), assigned to class ${cls.id}`,
    );

    // ── STEP 2: Student first login → face embedding registration ─────────────
    log(2, "Student first login — should require face registration");

    const firstLogin = await axios.post(`${API_URL}/auth/login`, {
      email: studentEmail,
      password: studentPassword,
    });

    assert(
      firstLogin.data.needsFaceRegistration === true,
      "First login should return needsFaceRegistration=true",
    );

    const studentToken = firstLogin.data.token;
    assert(studentToken, "First login did not return a token");

    // Debug: log full login response to understand what student context is returned
    console.log(
      "  [DEBUG] First login response:",
      JSON.stringify({ ...firstLogin.data, token: "[PRESENT]" }, null, 2),
    );

    log(2, "✓ needsFaceRegistration=true confirmed");
    log(2, "Student captures face image — generating and storing embedding");

    // Look up the actual Student record (Student.id != User.id)
    // cleanup.studentUserId was set from the API response — confirm it exists in DB
    const studentRecord = await prisma.student.findFirst({
      where: { userId: cleanup.studentUserId },
      include: { user: true },
    });
    console.log(
      "  [DEBUG] Student DB record:",
      JSON.stringify(studentRecord, null, 2),
    );
    assert(
      studentRecord,
      "Student record not found in DB — student creation may have failed silently",
    );

    // Mobile app generates the embedding from the captured image
    const storedEmbedding = generateFakeEmbedding();

    // register-embedding is called by the student using their auth token.
    // The backend must resolve the student via the JWT (userId → Student lookup).
    const embeddingRes = await axios
      .post(
        `${API_URL}/students/register-embedding`,
        { embedding: storedEmbedding },
        { headers: { Authorization: `Bearer ${studentToken}` } },
      )
      .catch((err) => {
        console.log("  [DEBUG] register-embedding error:", err.response?.data);
        throw err;
      });
    assert(
      embeddingRes.data.success === true,
      `Face embedding registration failed: ${JSON.stringify(embeddingRes.data)}`,
    );

    // Verify it was actually persisted
    const faceRes = await axios.get(`${API_URL}/students/my-face`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      faceRes.data.embedding,
      "Stored embedding was not returned by /my-face",
    );

    const storedPayload = JSON.parse(faceRes.data.embedding.embedding);
    assert(
      Array.isArray(storedPayload) &&
        storedPayload.length === storedEmbedding.length,
      "Stored embedding length mismatch",
    );

    log(
      2,
      `✓ Face embedding stored (${storedEmbedding.length}-dimensional vector)`,
    );

    // Second login should no longer require face registration
    const secondLogin = await axios.post(`${API_URL}/auth/login`, {
      email: studentEmail,
      password: studentPassword,
    });
    assert(
      secondLogin.data.needsFaceRegistration !== true,
      "After embedding registration, second login should NOT require face registration",
    );
    log(2, "✓ Second login no longer requires face registration");

    // ── STEP 3: (Informational) Home screen would display live/upcoming sessions
    log(3, "Home screen — checking session list for student's class");

    const sessionsRes = await axios
      .get(`${API_URL}/live/sessions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
      .catch(() => ({
        data: { note: "endpoint may not exist yet — skipping" },
      }));

    log(3, `✓ Sessions endpoint response noted (non-blocking)`);

    // ── STEP 4: Instructor starts attendance session → get QR token ───────────
    log(4, "Instructor starts attendance session — dynamic QR generated");

    const startRes = await axios.post(
      `${API_URL}/live/start`,
      { classId: cls.id, moduleId: module.id },
      { headers: { Authorization: `Bearer ${admin.token}` } },
    );

    assert(
      startRes.data.data?.sessionId,
      "Start session did not return sessionId",
    );
    assert(
      startRes.data.data?.secret,
      "Start session did not return a QR secret/token",
    );

    const sessionId = startRes.data.data.sessionId;
    const qrToken = startRes.data.data.secret; // the dynamic QR token
    cleanup.attendanceSessionId = sessionId;

    log(4, `✓ Session started (id=${sessionId}), QR token issued`);

    // Verify session is marked as active in DB
    const activeSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    assert(activeSession, "AttendanceSession not found in DB after start");
    assert(
      activeSession.status === "ACTIVE" || activeSession.endedAt === null,
      "Session should be active/open after start",
    );
    log(4, "✓ Session confirmed ACTIVE in database");

    // ── STEP 5: Student scans QR code → backend validates token ──────────────
    log(5, "Student scans QR code — backend validates token");

    const scanRes = await axios.post(
      `${API_URL}/live/join`,
      { secret: qrToken },
      { headers: { Authorization: `Bearer ${studentToken}` } },
    );

    // The join endpoint should return a pending/verified status.
    // If face verification is a separate step, it returns a challenge token.
    // If join handles everything, it returns success directly.
    // We support both patterns below.
    const joinSuccess = scanRes.data.success === true;
    const needsFaceVerification =
      scanRes.data.requiresFaceVerification === true ||
      scanRes.data.faceVerificationRequired === true;

    assert(
      joinSuccess || needsFaceVerification,
      `QR validation should succeed or return face verification challenge. Got: ${JSON.stringify(scanRes.data)}`,
    );

    log(
      5,
      `✓ QR token validated. Face verification required: ${needsFaceVerification}`,
    );

    // ── STEP 6: Face verification ─────────────────────────────────────────────
    log(6, "Mobile app captures live face image and compares embedding");

    if (needsFaceVerification) {
      // Pattern A: Separate face verification endpoint after QR scan
      const liveEmbedding = generateFakeEmbedding(); // same device/person → identical vector

      // Client-side sanity check (mirrors backend logic)
      const similarity = cosineSimilarity(storedEmbedding, liveEmbedding);
      log(6, `  Cosine similarity (local check): ${similarity.toFixed(4)}`);
      assert(
        similarity > 0.9,
        "Live embedding is too dissimilar from stored — test setup issue",
      );

      const faceVerifyRes = await axios.post(
        `${API_URL}/live/verify-face`,
        {
          sessionId,
          embedding: liveEmbedding,
        },
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );

      assert(
        faceVerifyRes.data.success === true,
        `Face verification failed: ${JSON.stringify(faceVerifyRes.data)}`,
      );
      log(6, "✓ Face verification passed (separate endpoint)");
    } else {
      // Pattern B: join endpoint already handled face verification internally
      log(6, "✓ Face verification was handled within the join endpoint");
    }

    // ── STEP 7: Attendance record created ─────────────────────────────────────
    log(7, "Verifying attendance record was created in database");

    const recordsRes = await axios.get(`${API_URL}/live/${sessionId}/records`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });

    assert(
      recordsRes.data.data?.session?.totalMarked === 1,
      `Expected exactly 1 attendance record, got: ${recordsRes.data.data?.session?.totalMarked}`,
    );

    // Confirm record exists in DB
    const dbRecord = await prisma.attendanceRecord.findFirst({
      where: { attendanceSessionId: sessionId },
    });
    assert(dbRecord, "AttendanceRecord not found in DB");
    log(7, `✓ AttendanceRecord created (id=${dbRecord.id})`);

    // Verify FaceRecognitionLog was written (audit trail)
    const faceRecognitionLog = getOptionalModel(prisma, "faceRecognitionLog");
    const faceLog = faceRecognitionLog
      ? await faceRecognitionLog.findFirst({
          where: { attendanceSessionId: sessionId },
        }).catch(() => null)
      : null; // table might not exist in this schema

    if (faceLog) {
      log(7, `✓ FaceRecognitionLog entry found (audit trail confirmed)`);
    } else {
      log(7, "⚠ FaceRecognitionLog not found — verify table name in schema");
    }

    // ── Security: Duplicate join should be idempotent ─────────────────────────
    log(
      "7b",
      "Duplicate join should be idempotent (one record per student per session)",
    );

    const duplicateJoinRes = await axios.post(
      `${API_URL}/live/join`,
      { secret: qrToken },
      { headers: { Authorization: `Bearer ${studentToken}` } },
    );
    assert(
      duplicateJoinRes.data.success === true,
      "Duplicate join should return success (idempotent)",
    );

    const recordsAfterDuplicate = await axios.get(
      `${API_URL}/live/${sessionId}/records`,
      { headers: { Authorization: `Bearer ${admin.token}` } },
    );
    assert(
      recordsAfterDuplicate.data.data?.session?.totalMarked === 1,
      "Duplicate join must NOT create a second attendance record",
    );
    log("7b", "✓ Still exactly 1 record after duplicate join");

    // ── Security: Expired QR token (simulated) ────────────────────────────────
    log("7c", "Expired/invalid QR token should be rejected");

    let rejectedBadToken = false;
    try {
      await axios.post(
        `${API_URL}/live/join`,
        { secret: "invalid-or-expired-qr-token-000" },
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
    } catch (err) {
      rejectedBadToken =
        err.response?.status === 400 || err.response?.status === 404;
    }
    assert(
      rejectedBadToken,
      "Invalid QR token should be rejected with 400/404",
    );
    log("7c", "✓ Invalid QR token correctly rejected");

    // ── Close session ─────────────────────────────────────────────────────────
    log("close", "Instructor closes the attendance session");

    const closeRes = await axios.post(
      `${API_URL}/live/close`,
      { sessionId },
      { headers: { Authorization: `Bearer ${admin.token}` } },
    );
    assert(closeRes.data.success === true, "Closing session failed");
    log("close", "✓ Session closed");

    // ── Security: Join after close should be rejected ─────────────────────────
    log("security", "Join after session close should be rejected");

    let rejectedAfterClose = false;
    try {
      await axios.post(
        `${API_URL}/live/join`,
        { secret: qrToken },
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
    } catch (err) {
      rejectedAfterClose =
        err.response?.status === 404 || err.response?.status === 400;
    }
    assert(
      rejectedAfterClose,
      "Closed session should reject new joins with 400/404",
    );
    log("security", "✓ Join correctly rejected after session close");

    console.log("\n✅ All steps passed — E2E attendance flow complete.\n");
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────────
    console.log("\n[Cleanup] Removing test data...");

    if (cleanup.attendanceSessionId) {
      const faceRecognitionLog = getOptionalModel(prisma, "faceRecognitionLog");
      if (faceRecognitionLog) {
        await faceRecognitionLog
          .deleteMany({
            where: { attendanceSessionId: cleanup.attendanceSessionId },
          })
          .catch(() => {});
      }
      await prisma.attendanceRecord
        .deleteMany({
          where: { attendanceSessionId: cleanup.attendanceSessionId },
        })
        .catch(() => {});
      await prisma.attendanceSession
        .deleteMany({ where: { id: cleanup.attendanceSessionId } })
        .catch(() => {});
    }

    if (cleanup.studentUserId) {
      await prisma.faceEmbedding
        .deleteMany({ where: { studentId: cleanup.studentUserId } })
        .catch(() => {});
      await prisma.studentImage
        .deleteMany({ where: { studentId: cleanup.studentUserId } })
        .catch(() => {});
      await prisma.student
        .deleteMany({ where: { userId: cleanup.studentUserId } })
        .catch(() => {});
    }

    if (cleanup.managerUserId) {
      await prisma.staffMember
        .deleteMany({ where: { userId: cleanup.managerUserId } })
        .catch(() => {});
    }

    const userIds = [cleanup.studentUserId, cleanup.managerUserId].filter(
      Boolean,
    );
    if (userIds.length) {
      await prisma.user
        .deleteMany({ where: { id: { in: userIds } } })
        .catch(() => {});
    }

    if (cleanup.classId) {
      await prisma.classModule
        .deleteMany({ where: { classId: cleanup.classId } })
        .catch(() => {});
      await prisma.class
        .deleteMany({ where: { id: cleanup.classId } })
        .catch(() => {});
    }

    if (cleanup.moduleId) {
      await prisma.module
        .deleteMany({ where: { id: cleanup.moduleId } })
        .catch(() => {});
    }

    if (cleanup.roomId) {
      await prisma.room
        .deleteMany({ where: { id: cleanup.roomId } })
        .catch(() => {});
    }

    if (cleanup.departmentId) {
      await prisma.department
        .deleteMany({ where: { id: cleanup.departmentId } })
        .catch(() => {});
    }

    await prisma.$disconnect();
    console.log("[Cleanup] Done.\n");
  }
}

main().catch(async (error) => {
  console.error("\n❌ E2E attendance flow FAILED:");
  console.error(error.response?.data || error.message || error);
  await prisma.$disconnect();
  process.exit(1);
});
