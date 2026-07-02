const crypto = require("crypto");
const prisma = require("../utils/prisma");

const QR_TTL_MS = 5000;

function generateSecret() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function buildToken(sessionId, issuedAt) {
  return `${sessionId}:${issuedAt.getTime()}`;
}

function parseToken(token) {
  const [attendanceSessionId, issuedAtRaw] = String(token || "").split(":");
  const issuedAtMs = Number(issuedAtRaw);
  if (!attendanceSessionId || !Number.isFinite(issuedAtMs)) {
    return null;
  }
  return { attendanceSessionId, issuedAtMs };
}

async function rotateToken(attendanceSession) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + QR_TTL_MS);
  const qrToken = buildToken(attendanceSession.id, issuedAt);

  return prisma.attendanceSession.update({
    where: { id: attendanceSession.id },
    data: {
      qrToken,
      qrIssuedAt: issuedAt,
      qrExpiresAt: expiresAt,
    },
  });
}

async function getActiveAttendanceSession(sessionId, staffId) {
  return prisma.attendanceSession.findFirst({
    where: {
      sessionId,
      staffId,
      status: "ACTIVE",
    },
  });
}

async function getOrCreateLiveSession(sessionId, staffId) {
  const existing = await getActiveAttendanceSession(sessionId, staffId);
  if (existing) return existing;

  return prisma.attendanceSession.create({
    data: {
      sessionId,
      staffId,
      secret: generateSecret(),
      status: "ACTIVE",
    },
  });
}

async function ensureCurrentToken(attendanceSession) {
  const now = new Date();
  if (
    attendanceSession.qrToken &&
    attendanceSession.qrExpiresAt &&
    attendanceSession.qrExpiresAt.getTime() > now.getTime()
  ) {
    return attendanceSession;
  }

  return rotateToken(attendanceSession);
}

// POST /api/live/start
async function startSession(req, res) {
  try {
    const staffId = req.user.userId;
    const { sessionId } = req.body;

    if (!Number.isInteger(Number(sessionId))) {
      return res
        .status(400)
        .json({ success: false, message: "sessionId is required" });
    }

    const session = await prisma.session.findUnique({
      where: { id: Number(sessionId) },
      select: { id: true, classId: true },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    const attendanceSession = await getOrCreateLiveSession(session.id, staffId);
    const activeSession = await ensureCurrentToken(attendanceSession);

    res.status(201).json({
      success: true,
      message: "Live session started",
      data: {
        sessionId: activeSession.id,
        academicSessionId: activeSession.sessionId,
        secret: activeSession.secret,
        qrToken: activeSession.qrToken,
        qrExpiresAt: activeSession.qrExpiresAt,
        startTime: activeSession.startTime,
      },
    });
  } catch (err) {
    console.error("[live/start]", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to start session" });
  }
}

// GET /api/live/:sessionId/qr
async function getCurrentQr(req, res) {
  try {
    const staffId = req.user.userId;
    const sessionId = Number(req.params.sessionId);
    const attendanceSession = await getActiveAttendanceSession(
      sessionId,
      staffId,
    );

    if (!attendanceSession) {
      return res
        .status(404)
        .json({ success: false, message: "Active session not found" });
    }

    const current = await ensureCurrentToken(attendanceSession);

    res.json({
      success: true,
      data: {
        sessionId: current.id,
        academicSessionId: current.sessionId,
        qrToken: current.qrToken,
        qrExpiresAt: current.qrExpiresAt,
      },
    });
  } catch (err) {
    console.error("[live/qr]", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch QR token" });
  }
}

// POST /api/live/join
async function joinSession(req, res) {
  try {
    const studentId = req.user.userId;
    const { token, secret } = req.body;
    const rawToken = token || secret;

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      select: { userId: true, classId: true },
    });
    if (!student) {
      return res
        .status(403)
        .json({ success: false, message: "Only students can join sessions" });
    }

    const parsed = parseToken(rawToken);
    if (!parsed) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid QR token" });
    }

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id: parsed.attendanceSessionId },
      include: { session: true },
    });

    if (!attendanceSession || attendanceSession.status !== "ACTIVE") {
      return res
        .status(404)
        .json({ success: false, message: "Invalid or expired code" });
    }

    if (!attendanceSession.qrToken || attendanceSession.qrToken !== rawToken) {
      return res
        .status(400)
        .json({ success: false, message: "QR token is not valid anymore" });
    }

    if (
      !attendanceSession.qrExpiresAt ||
      attendanceSession.qrExpiresAt.getTime() < Date.now()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "QR token expired" });
    }

    if (attendanceSession.session.classId !== student.classId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Student does not belong to this class",
        });
    }

    const record = await prisma.attendance.upsert({
      where: {
        studentId_sessionId_date: {
          studentId,
          sessionId: attendanceSession.sessionId,
          date: new Date(attendanceSession.startTime),
        },
      },
      update: {
        source: "LIVE_QR",
      },
      create: {
        studentId,
        sessionId: attendanceSession.sessionId,
        attendanceSessionId: attendanceSession.id,
        markedBy: attendanceSession.staffId,
        date: new Date(attendanceSession.startTime),
        status: "PRESENT",
        source: "LIVE_QR",
      },
    });

    res.json({
      success: true,
      message: "Attendance marked successfully",
      data: { markedAt: record.createdAt },
    });
  } catch (err) {
    console.error("[live/join]", err);
    res.status(500).json({ success: false, message: "Failed to join session" });
  }
}

// POST /api/live/close
async function closeSession(req, res) {
  try {
    const staffId = req.user.userId;
    const { sessionId } = req.body;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!attendanceSession)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    if (attendanceSession.staffId !== staffId) {
      return res
        .status(403)
        .json({ success: false, message: "Not your session" });
    }
    if (attendanceSession.status === "CLOSED") {
      return res
        .status(400)
        .json({ success: false, message: "Session already closed" });
    }

    const closed = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { status: "CLOSED", endTime: new Date() },
    });

    res.json({ success: true, message: "Session closed", data: closed });
  } catch (err) {
    console.error("[live/close]", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to close session" });
  }
}

// GET /api/live/:sessionId/records
async function getSessionRecords(req, res) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        markedAttendances: {
          include: {
            student: {
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
          orderBy: { markedAt: "asc" },
        },
      },
    });

    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          totalMarked: session.markedAttendances.length,
        },
        records: session.markedAttendances,
      },
    });
  } catch (err) {
    console.error("[live/records]", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch records" });
  }
}

// GET /api/live/my-sessions
async function mySessions(req, res) {
  try {
    const staffId = Number(req.user.userId);

    if (!Number.isInteger(staffId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user id" });
    }

    let sessions;

    try {
      sessions = await prisma.attendanceSession.findMany({
        where: { staffId },
        include: {
          _count: { select: { markedAttendances: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (innerErr) {
      // Handle cases where the DB contains corrupted rows (e.g. sessionId IS NULL)
      const msg = String(innerErr?.message || "");
      console.warn("[live/my-sessions] Prisma findMany failed, falling back to raw query:", msg);

      // Fallback: use a raw query that excludes rows with NULL sessionId to avoid
      // Prisma model conversion errors when the DB contains invalid data.
      // Note: Uses parameter binding to avoid injection.
      const raw = await prisma.$queryRaw`
        SELECT s.*, (
          SELECT COUNT(*) FROM "AttendanceRecord" ar WHERE ar."attendanceSessionId" = s.id
        ) AS "markedAttendancesCount"
        FROM "AttendanceSession" s
        WHERE s."staffId" = ${staffId} AND s."sessionId" IS NOT NULL
        ORDER BY s."createdAt" DESC
      `;

      // Map raw rows to an object shape similar to the original response.
      sessions = raw.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        staffId: r.staffId,
        secret: r.secret,
        status: r.status,
        qrToken: r.qrToken,
        qrIssuedAt: r.qrIssuedAt,
        qrExpiresAt: r.qrExpiresAt,
        startTime: r.startTime,
        endTime: r.endTime,
        createdAt: r.createdAt,
        _count: { markedAttendances: Number(r.markedAttendancesCount || 0) },
      }));
    }

    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error("[live/my-sessions]", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch sessions" });
  }
}

module.exports = {
  startSession,
  getCurrentQr,
  joinSession,
  closeSession,
  getSessionRecords,
  mySessions,
};
