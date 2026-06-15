const crypto = require("crypto");
const prisma = require("../utils/prisma");

// ════════════════════════════════════════════════════════════
// POST /api/live/start
// الأستاذ يفتح session حضور مباشر
// ════════════════════════════════════════════════════════════
async function startSession(req, res) {
  try {
    const staffId = req.user.userId;

    // تحقق إنه مفيش session مفتوحة للأستاذ ده
    const existing = await prisma.attendanceSession.findFirst({
      where: { staffId, status: "ACTIVE" },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have an active session",
        sessionId: existing.id,
        secret: existing.secret,
      });
    }

    // نولد secret عشوائي (ده اللي هيتحول QR code في الـ frontend)
    const secret = crypto.randomBytes(4).toString("hex").toUpperCase(); // مثلاً: "A3F2"

    const session = await prisma.attendanceSession.create({
      data: { staffId, secret },
    });

    res.status(201).json({
      success: true,
      message: "Live session started",
      data: {
        sessionId: session.id,
        secret: session.secret,
        startTime: session.startTime,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to start session" });
  }
}

// ════════════════════════════════════════════════════════════
// POST /api/live/join
// الطالب يسجل حضوره بالـ secret
// ════════════════════════════════════════════════════════════
async function joinSession(req, res) {
  try {
    const studentId = req.user.userId;
    const { secret } = req.body;

    // التحقق إن المستخدم ده فعلاً student
    const student = await prisma.student.findUnique({ where: { userId: studentId } });
    if (!student) {
      return res.status(403).json({ success: false, message: "Only students can join sessions" });
    }

    // ابحث عن الـ session المفتوحة بالـ secret ده
    const session = await prisma.attendanceSession.findFirst({
      where: { secret: secret.toUpperCase(), status: "ACTIVE" },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Invalid or expired code" });
    }

    // سجل الحضور (upsert عشان ميتسجلش مرتين)
    const record = await prisma.attendanceRecord.upsert({
      where: {
        studentId_attendanceSessionId: {
          studentId,
          attendanceSessionId: session.id,
        },
      },
      update: {}, // لو موجود متغيرش حاجة
      create: { studentId, attendanceSessionId: session.id },
    });

    res.json({
      success: true,
      message: "Attendance marked successfully ✅",
      data: { markedAt: record.markedAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to join session" });
  }
}

// ════════════════════════════════════════════════════════════
// POST /api/live/close
// الأستاذ يقفل الـ session
// ════════════════════════════════════════════════════════════
async function closeSession(req, res) {
  try {
    const staffId = req.user.userId;
    const { sessionId } = req.body;

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (session.staffId !== staffId) {
      return res.status(403).json({ success: false, message: "Not your session" });
    }
    if (session.status === "CLOSED") {
      return res.status(400).json({ success: false, message: "Session already closed" });
    }

    const closed = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { status: "CLOSED", endTime: new Date() },
    });

    res.json({ success: true, message: "Session closed", data: closed });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to close session" });
  }
}

// ════════════════════════════════════════════════════════════
// GET /api/live/:sessionId/records
// جيب كل الطلاب اللي سجلوا حضورهم في الـ session دي
// ════════════════════════════════════════════════════════════
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

    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

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
    res.status(500).json({ success: false, message: "Failed to fetch records" });
  }
}

// ════════════════════════════════════════════════════════════
// GET /api/live/my-sessions
// الأستاذ يشوف sessions بتاعته
// ════════════════════════════════════════════════════════════
async function mySessions(req, res) {
  try {
    const staffId = req.user.userId;

    const sessions = await prisma.attendanceSession.findMany({
      where: { staffId },
      include: {
        _count: { select: { markedAttendances: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch sessions" });
  }
}

module.exports = { startSession, joinSession, closeSession, getSessionRecords, mySessions };
