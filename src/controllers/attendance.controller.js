const crypto = require("crypto");
const prisma = require("../utils/prisma");

const QR_TTL_MS = 5000;

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function generateAttendanceSessionSecret(prefix = "ATT") {
  return `${prefix}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

function buildQrToken(attendanceSessionId, issuedAt) {
  return `${attendanceSessionId}.${issuedAt.getTime()}`;
}

async function getOrCreateActiveAttendanceSession({ sessionId, staffId }) {
  const existing = await prisma.attendanceSession.findFirst({
    where: { sessionId, status: "ACTIVE" },
  });

  if (existing) {
    return existing;
  }

  return prisma.attendanceSession.create({
    data: {
      sessionId,
      staffId,
      secret: generateAttendanceSessionSecret("MANUAL"),
      status: "ACTIVE",
      qrToken: null,
      qrIssuedAt: null,
      qrExpiresAt: null,
    },
  });
}

async function validateStudentForSession(studentId, sessionId) {
  const student = await prisma.student.findUnique({
    where: { userId: studentId },
    select: { userId: true, classId: true },
  });
  if (!student) {
    return { ok: false, message: "Student not found" };
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, classId: true },
  });
  if (!session) {
    return { ok: false, message: "Session not found" };
  }

  if (student.classId !== session.classId) {
    return { ok: false, message: "Student does not belong to this class" };
  }

  return { ok: true, student, session };
}

// GET /api/attendance
async function getAll(req, res) {
  try {
    const { sessionId, classId, date, status, source } = req.query;
    const where = {};

    if (sessionId) where.sessionId = Number(sessionId);
    if (status) where.status = status;
    if (source) where.source = source;
    if (date) {
      const from = normalizeDate(date);
      if (from) {
        where.date = {
          gte: from,
          lt: new Date(from.getTime() + 24 * 60 * 60 * 1000),
        };
      }
    }
    if (classId) {
      where.session = { classId: Number(classId) };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        session: { include: { module: true, class: true, room: true } },
        attendanceSession: true,
        marker: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch attendance" });
  }
}

// POST /api/attendance
// Manual attendance is always attached to the active attendance-session container.
async function markOne(req, res) {
  try {
    const { studentId, sessionId, date, status } = req.body;
    const markedBy = req.user.userId;
    const normalizedSessionId = Number(sessionId);
    const normalizedStudentId = Number(studentId);
    const attendanceDate = normalizeDate(date);

    if (!Number.isInteger(normalizedSessionId) || !Number.isInteger(normalizedStudentId) || !attendanceDate) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const eligibility = await validateStudentForSession(normalizedStudentId, normalizedSessionId);
    if (!eligibility.ok) {
      return res.status(400).json({ success: false, message: eligibility.message });
    }

    const attendanceSession = await getOrCreateActiveAttendanceSession({
      sessionId: normalizedSessionId,
      staffId: markedBy,
    });

    const record = await prisma.attendance.upsert({
      where: {
        studentId_sessionId_date: {
          studentId: normalizedStudentId,
          sessionId: normalizedSessionId,
          date: attendanceDate,
        },
      },
      update: {
        status,
        markedBy,
        source: "MANUAL",
        attendanceSessionId: attendanceSession.id,
      },
      create: {
        studentId: normalizedStudentId,
        sessionId: normalizedSessionId,
        attendanceSessionId: attendanceSession.id,
        date: attendanceDate,
        status,
        markedBy,
        source: "MANUAL",
      },
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark attendance" });
  }
}

// POST /api/attendance/bulk
async function markBulk(req, res) {
  try {
    const { sessionId, date, attendances } = req.body;
    const markedBy = req.user.userId;
    const normalizedSessionId = Number(sessionId);
    const attendanceDate = normalizeDate(date);

    if (!Number.isInteger(normalizedSessionId) || !attendanceDate || !Array.isArray(attendances)) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const attendanceSession = await getOrCreateActiveAttendanceSession({
      sessionId: normalizedSessionId,
      staffId: markedBy,
    });

    for (const { studentId } of attendances) {
      const normalizedStudentId = Number(studentId);
      const eligibility = await validateStudentForSession(normalizedStudentId, normalizedSessionId);
      if (!eligibility.ok) {
        return res.status(400).json({ success: false, message: eligibility.message });
      }
    }

    const results = await prisma.$transaction(
      attendances.map(({ studentId, status }) =>
        prisma.attendance.upsert({
          where: {
            studentId_sessionId_date: {
              studentId: Number(studentId),
              sessionId: normalizedSessionId,
              date: attendanceDate,
            },
          },
          update: {
            status,
            markedBy,
            source: "MANUAL",
            attendanceSessionId: attendanceSession.id,
          },
          create: {
            studentId: Number(studentId),
            sessionId: normalizedSessionId,
            attendanceSessionId: attendanceSession.id,
            date: attendanceDate,
            status,
            markedBy,
            source: "MANUAL",
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `Marked ${results.length} students`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to bulk mark attendance" });
  }
}

// PUT /api/attendance/:id
async function update(req, res) {
  try {
    const { status } = req.body;
    const record = await prisma.attendance.update({
      where: { id: Number(req.params.id) },
      data: { status, markedBy: req.user.userId },
    });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update attendance" });
  }
}

// DELETE /api/attendance/:id
async function remove(req, res) {
  try {
    await prisma.attendance.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Attendance record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete attendance" });
  }
}

// GET /api/attendance/report/class/:classId
async function classReport(req, res) {
  try {
    const classId = Number(req.params.classId);
    const { from, to, moduleId } = req.query;

    const where = { session: { classId } };
    if (moduleId) where.session.moduleId = Number(moduleId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        session: { include: { module: true } },
        attendanceSession: true,
      },
      orderBy: [{ date: "asc" }, { studentId: "asc" }],
    });

    const studentMap = {};
    for (const r of records) {
      const sid = r.studentId;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          studentId: sid,
          fullName: r.student.user.fullName,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        };
      }
      studentMap[sid].total++;
      if (r.status === "PRESENT") studentMap[sid].present++;
      if (r.status === "ABSENT") studentMap[sid].absent++;
      if (r.status === "LATE") studentMap[sid].late++;
    }

    const summary = Object.values(studentMap).map((s) => ({
      ...s,
      rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to generate report" });
  }
}

module.exports = { getAll, markOne, markBulk, update, remove, classReport };
