const prisma = require("../utils/prisma");

// GET /api/attendance
// جيب كل سجلات الحضور مع فلاتر
async function getAll(req, res) {
  try {
    const { sessionId, classId, date, status } = req.query;
    const where = {};

    if (sessionId) where.sessionId = Number(sessionId);
    if (status)    where.status = status;
    if (date)      where.date = { gte: new Date(date), lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) };
    if (classId) {
      where.session = { classId: Number(classId) };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        session: { include: { module: true, class: true, room: true } },
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
// تسجيل حضور يدوي لطالب في session معينة
async function markOne(req, res) {
  try {
    const { studentId, sessionId, date, status } = req.body;
    const markedBy = req.user.userId;

    const record = await prisma.attendance.upsert({
      where: {
        studentId_sessionId_date: {
          studentId: Number(studentId),
          sessionId: Number(sessionId),
          date: new Date(date),
        },
      },
      update: { status, markedBy },
      create: {
        studentId: Number(studentId),
        sessionId: Number(sessionId),
        date: new Date(date),
        status,
        markedBy,
      },
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark attendance" });
  }
}

// POST /api/attendance/bulk
// تسجيل حضور لكل طلاب الـ class في session معينة دفعة واحدة
async function markBulk(req, res) {
  try {
    // attendances: [{ studentId, status }]
    const { sessionId, date, attendances } = req.body;
    const markedBy = req.user.userId;

    // نستخدم transaction عشان إما كلهم ينجحوا أو كلهم يفشلوا
    const results = await prisma.$transaction(
      attendances.map(({ studentId, status }) =>
        prisma.attendance.upsert({
          where: {
            studentId_sessionId_date: {
              studentId: Number(studentId),
              sessionId: Number(sessionId),
              date: new Date(date),
            },
          },
          update: { status, markedBy },
          create: {
            studentId: Number(studentId),
            sessionId: Number(sessionId),
            date: new Date(date),
            status,
            markedBy,
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
// تعديل حالة حضور موجود
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
// تقرير حضور كامل للـ class
async function classReport(req, res) {
  try {
    const classId = Number(req.params.classId);
    const { from, to, moduleId } = req.query;

    const where = { session: { classId } };
    if (moduleId) where.session.moduleId = Number(moduleId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        session: { include: { module: true } },
      },
      orderBy: [{ date: "asc" }, { studentId: "asc" }],
    });

    // تجميع البيانات حسب الطالب
    const studentMap = {};
    for (const r of records) {
      const sid = r.studentId;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          studentId: sid,
          fullName: r.student.user.fullName,
          total: 0, present: 0, absent: 0, late: 0,
        };
      }
      studentMap[sid].total++;
      if (r.status === "PRESENT") studentMap[sid].present++;
      if (r.status === "ABSENT")  studentMap[sid].absent++;
      if (r.status === "LATE")    studentMap[sid].late++;
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
