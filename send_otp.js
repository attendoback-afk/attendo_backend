const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_URL = "http://localhost:3001/api";

// Update these to a real, existing account in your DB
const LOGIN_EMAIL = "admin@attendo.test";
const LOGIN_PASSWORD = "Tr0ub4dor&Zx9k";

let authToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjM2LCJlbWFpbCI6ImFkbWluQGF0dGVuZG8udGVzdCIsInJvbGUiOiJNQU5BR0VSIiwiaWF0IjoxNzgxODE4ODk5LCJleHAiOjE3ODI0MjM2OTl9.S6Zk8WDPBrBHGfwlm5x_QzkInKRR9m1deaRGY8LVBok";
let createdSessionId = null;

function authHeaders() {
  return { headers: { Authorization: `Bearer ${authToken}` } };
}

async function testCreateSession() {
  console.log(`\n🚀 POST /sessions - creating session\n`);

  const res = await axios.post(
    `${API_URL}/sessions`,
    {
      classId: 1,
      moduleId: 1,
      roomId: 1,
      dayOfWeek: 1,
      startTime: "1970-01-01T10:00:00Z",
      endTime: "1970-01-01T11:00:00Z",
    },
    authHeaders(),
  );

  if (res.status === 201 && res.data.success) {
    createdSessionId = res.data.data?.id || res.data.session?.id;
    console.log(`✓ Session created successfully (id: ${createdSessionId})`);

    if (createdSessionId) {
      const dbSession = await prisma.session.findUnique({
        where: { id: createdSessionId },
      });
      console.log(`✓ Verified in DB:`, dbSession ? "found" : "NOT FOUND");
    }
  } else {
    throw new Error(res.data.message || "Unexpected response on create");
  }
}

async function testGetAllSessions() {
  console.log(`\n🚀 GET /sessions - listing sessions\n`);

  const res = await axios.get(`${API_URL}/sessions`, authHeaders());

  if (res.status === 200 && res.data.success) {
    const count = Array.isArray(res.data.data) ? res.data.data.length : "?";
    console.log(`✓ Fetched session list (count: ${count})`);
  } else {
    throw new Error(res.data.message || "Unexpected response on list");
  }
}

async function testGetSessionById() {
  if (!createdSessionId) {
    console.log(`⚠ Skipping GET /sessions/:id - no session id available`);
    return;
  }

  console.log(
    `\n🚀 GET /sessions/${createdSessionId} - fetching single session\n`,
  );

  const res = await axios.get(
    `${API_URL}/sessions/${createdSessionId}`,
    authHeaders(),
  );

  if (res.status === 200 && res.data.success) {
    console.log(`✓ Fetched session: ${createdSessionId}`);
  } else {
    throw new Error(res.data.message || "Unexpected response on get-by-id");
  }
}

async function testUpdateSession() {
  if (!createdSessionId) {
    console.log(`⚠ Skipping PUT /sessions/:id - no session id available`);
    return;
  }

  console.log(`\n🚀 PUT /sessions/${createdSessionId} - updating session\n`);

  const res = await axios.put(
    `${API_URL}/sessions/${createdSessionId}`,
    {
      dayOfWeek: 2,
      startTime: "1970-01-01T14:00:00Z",
      endTime: "1970-01-01T15:00:00Z",
    },
    authHeaders(),
  );

  if (res.status === 200 && res.data.success) {
    console.log(`✓ Session updated successfully`);

    const dbSession = await prisma.session.findUnique({
      where: { id: createdSessionId },
    });
    console.log(`✓ Verified update in DB - dayOfWeek: ${dbSession?.dayOfWeek}`);
  } else {
    throw new Error(res.data.message || "Unexpected response on update");
  }
}

async function testDeleteSession() {
  if (!createdSessionId) {
    console.log(`⚠ Skipping DELETE /sessions/:id - no session id available`);
    return;
  }

  console.log(`\n🚀 DELETE /sessions/${createdSessionId} - deleting session\n`);

  const res = await axios.delete(
    `${API_URL}/sessions/${createdSessionId}`,
    authHeaders(),
  );

  if (res.status === 200 && res.data.success) {
    console.log(`✓ Session deleted successfully`);
  } else {
    throw new Error(res.data.message || "Unexpected response on delete");
  }
}

async function runTests() {
  // NOTE: per your request, created sessions are NOT cleaned up automatically.
  // testDeleteSession() is defined above but not called in the default run below.
  // Uncomment it in the sequence if you want to exercise the DELETE endpoint too.

  try {

    await testCreateSession();
    await testGetAllSessions();
    await testGetSessionById();
    await testUpdateSession();
    // await testDeleteSession();

    console.log(`\n✅ All session endpoint tests completed\n`);
  } catch (err) {
    console.error(
      `\n✗ Error: ${err} ${err.response?.data?.message || err.message}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
