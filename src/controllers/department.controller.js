const prisma = require("../utils/prisma");

// GET /api/departments
async function getAll(req, res) {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { classes: true } } },
    });
    res.json({ success: true, data: departments });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch departments" });
  }
}

// GET /api/departments/:id
async function getOne(req, res) {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: Number(req.params.id) },
      include: { classes: true },
    });
    if (!dept)
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    res.json({ success: true, data: dept });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch department" });
  }
}

// POST /api/departments
async function create(req, res) {
  try {
    const { name, code } = req.body;
    const dept = await prisma.department.create({ data: { name, code } });
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create department" });
  }
}

// PUT /api/departments/:id
async function update(req, res) {
  try {
    const { name, code } = req.body;
    const dept = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: { name, code },
    });
    res.json({ success: true, data: dept });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update department" });
  }
}

// DELETE /api/departments/:id
async function remove(req, res) {
  try {
    await prisma.department.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Department deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete department" });
  }
}

module.exports = { getAll, getOne, create, update, remove };
