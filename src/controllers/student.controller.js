const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

// GET /api/students
async function getAll(req, res) {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: { select: { fullName: true, email: true, isValid: true } },
        class: { include: { department: true } },
      },
    });
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
}

// GET /api/students/:id
async function getOne(req, res) {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: Number(req.params.id) },
      include: {
        user: { select: { fullName: true, email: true } },
        class: { include: { department: true, modules: { include: { module: true } } } },
      },
    });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch student" });
  }
}

// POST /api/students
// إنشاء يوزر + ربطه بـ student في نفس الوقت
async function create(req, res) {
  try {
    const { fullName, email, password, studentCode, classId } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // transaction: ننشئ الـ user والـ student مع بعض
    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { fullName, email, passwordHash, invalid: false }, // Manager بيضيفه فـ invalid = false مباشرة
      });
      return tx.student.create({
        data: { userId: user.id, studentCode, classId: Number(classId) },
      });
    });

    res.status(201).json({ success: true, data: student });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ success: false, message: "Student code already exists" });
    }
    res.status(500).json({ success: false, message: "Failed to create student" });
  }
}

// PUT /api/students/:id
async function update(req, res) {
  try {
    const { studentCode, classId } = req.body;
    const student = await prisma.student.update({
      where: { userId: Number(req.params.id) },
      data: { studentCode, classId: Number(classId) },
    });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update student" });
  }
}

// DELETE /api/students/:id
async function remove(req, res) {
  try {
    // حذف الـ user بيحذف الـ student تلقائياً (onDelete: Cascade)
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete student" });
  }
}

// GET /api/students/:id/attendance
// جيب سجل حضور الطالب
async function getAttendance(req, res) {
  try {
    const studentId = Number(req.params.id);
    const { moduleId, from, to } = req.query;

    const where = { studentId };
    if (moduleId) {
      where.session = { moduleId: Number(moduleId) };
    }
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        session: {
          include: {
            module: true,
            room: true,
            class: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // حساب الإحصائيات
    const total = attendances.length;
    const present = attendances.filter((a) => a.status === "PRESENT").length;
    const absent = attendances.filter((a) => a.status === "ABSENT").length;
    const late = attendances.filter((a) => a.status === "LATE").length;

    res.json({
      success: true,
      stats: { total, present, absent, late, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
      data: attendances,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch attendance" });
  }
}

module.exports = { getAll, getOne, create, update, remove, getAttendance };
