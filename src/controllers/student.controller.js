const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

// GET /api/students
async function getAll(req, res) {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: { select: { fullName: true, email: true, invalid: true } }, // fixed: was isValid (not a real column)
        class: { include: { department: true } },
      },
    });
    res.json({ success: true, data: students });
  } catch (err) {
    console.error(err); // fixed: was silently swallowed
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch students" });
  }
}

// GET /api/students/:id
// NOTE: :id here is the User.id (Student.userId is the FK/PK), kept consistent with create/remove
async function getOne(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student id" });
    }

    const student = await prisma.student.findUnique({
      where: { userId: id },
      include: {
        user: { select: { fullName: true, email: true } },
        class: {
          include: { department: true, modules: { include: { module: true } } },
        },
      },
    });
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    res.json({ success: true, data: student });
  } catch (err) {
    console.error(err); // fixed: was silently swallowed
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch student" });
  }
}

// POST /api/students
// إنشاء يوزر + ربطه بـ student في نفس الوقت
async function create(req, res) {
  try {
    const { fullName, email, password, studentCode, classId } = req.body;

    // fixed: no validation previously — missing fields caused confusing 500s
    if (
      !fullName ||
      !email ||
      !password ||
      !studentCode ||
      classId === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "fullName, email, password, studentCode, and classId are required",
      });
    }

    const classIdNum = Number(classId);
    if (!Number.isInteger(classIdNum)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid classId" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    // fixed: confirm the class actually exists before the transaction,
    // so a bad classId returns a clean 400 instead of a P2003 FK crash mid-transaction
    const classExists = await prisma.class.findUnique({
      where: { id: classIdNum },
    });
    if (!classExists) {
      return res
        .status(400)
        .json({ success: false, message: "Class not found" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // transaction: ننشئ الـ user والـ student مع بعض
    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { fullName, email, passwordHash, invalid: false }, // Manager بيضيفه فـ invalid = false مباشرة
      });
      return tx.student.create({
        data: { userId: user.id, studentCode, classId: classIdNum },
      });
    });

    res.status(201).json({ success: true, data: student });
  } catch (err) {
    console.error(err); // fixed: was silently swallowed
    if (err.code === "P2002") {
      return res
        .status(400)
        .json({ success: false, message: "Student code already exists" });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to create student" });
  }
}

// PUT /api/students/:id
async function update(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student id" });
    }

    const { studentCode, classId } = req.body;

    // fixed: only set fields that were actually provided, avoid Number(undefined) -> NaN
    const data = {};
    if (studentCode !== undefined) data.studentCode = studentCode;
    if (classId !== undefined) {
      const classIdNum = Number(classId);
      if (!Number.isInteger(classIdNum)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid classId" });
      }
      data.classId = classIdNum;
    }

    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const student = await prisma.student.update({
      where: { userId: id },
      data,
    });
    res.json({ success: true, data: student });
  } catch (err) {
    console.error(err); // fixed: was silently swallowed
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" }); // fixed: was generic 500
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to update student" });
  }
}

// DELETE /api/students/:id
async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student id" });
    }

    // حذف الـ user بيحذف الـ student تلقائياً (onDelete: Cascade)
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: "Student deleted" });
  } catch (err) {
    console.error(err); // fixed: was silently swallowed
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" }); // fixed: was generic 500
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to delete student" });
  }
}

// GET /api/students/:id/attendance
// جيب سجل حضور الطالب
async function getAttendance(req, res) {
  try {
    const studentId = Number(req.params.id);
    if (!Number.isInteger(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student id" });
    }

    const { moduleId, from, to } = req.query;

    const where = { studentId };
    if (moduleId) {
      const moduleIdNum = Number(moduleId);
      if (!Number.isInteger(moduleIdNum)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid moduleId" });
      }
      where.session = { moduleId: moduleIdNum };
    }
    if (from || to) {
      where.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid 'from' date" }); // fixed: was unvalidated
        }
        where.date.gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid 'to' date" }); // fixed: was unvalidated
        }
        where.date.lte = toDate;
      }
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
      stats: {
        total,
        present,
        absent,
        late,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      },
      data: attendances,
    });
  } catch (err) {
    console.error(err); // fixed: was silently swallowed
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch attendance" });
  }
}

module.exports = { getAll, getOne, create, update, remove, getAttendance };
