const prisma = require("../utils/prisma");

// GET /api/classes
async function getAll(req, res) {
  try {
    const classes = await prisma.class.findMany({
      include: {
        department: true,
        _count: { select: { students: true } },
      },
    });
    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch classes" });
  }
}

// GET /api/classes/:id
async function getOne(req, res) {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        department: true,
        students: { include: { user: { select: { fullName: true, email: true } } } },
        modules: { include: { module: true } },
        sessions: { include: { module: true, room: true } },
      },
    });
    if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
    res.json({ success: true, data: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch class" });
  }
}

// POST /api/classes
async function create(req, res) {
  try {
    const { name, classCode, departmentId, year, description } = req.body;
    const cls = await prisma.class.create({
      data: { name, classCode, departmentId: Number(departmentId), year: Number(year), description },
    });
    res.status(201).json({ success: true, data: cls });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ success: false, message: "Class code already exists" });
    }
    res.status(500).json({ success: false, message: "Failed to create class" });
  }
}

// PUT /api/classes/:id
async function update(req, res) {
  try {
    const { name, classCode, departmentId, year, description } = req.body;
    const cls = await prisma.class.update({
      where: { id: Number(req.params.id) },
      data: { name, classCode, departmentId: Number(departmentId), year: Number(year), description },
    });
    res.json({ success: true, data: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update class" });
  }
}

// DELETE /api/classes/:id
async function remove(req, res) {
  try {
    await prisma.class.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Class deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete class" });
  }
}

// POST /api/classes/:id/modules  → إضافة module للـ class
async function addModule(req, res) {
  try {
    const classId = Number(req.params.id);
    const moduleId = Number(req.body.moduleId);

    await prisma.classModule.create({ data: { classId, moduleId } });
    res.status(201).json({ success: true, message: "Module added to class" });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ success: false, message: "Module already in class" });
    }
    res.status(500).json({ success: false, message: "Failed to add module" });
  }
}

// DELETE /api/classes/:id/modules/:moduleId
async function removeModule(req, res) {
  try {
    await prisma.classModule.delete({
      where: {
        classId_moduleId: {
          classId: Number(req.params.id),
          moduleId: Number(req.params.moduleId),
        },
      },
    });
    res.json({ success: true, message: "Module removed from class" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove module" });
  }
}

module.exports = { getAll, getOne, create, update, remove, addModule, removeModule };
