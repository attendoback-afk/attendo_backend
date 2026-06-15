const prisma = require("../utils/prisma");

async function getAll(req, res) {
  try {
    const modules = await prisma.module.findMany({
      include: { _count: { select: { classes: true, sessions: true } } },
    });
    res.json({ success: true, data: modules });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch modules" });
  }
}

async function getOne(req, res) {
  try {
    const mod = await prisma.module.findUnique({
      where: { id: Number(req.params.id) },
      include: { classes: { include: { class: true } } },
    });
    if (!mod) return res.status(404).json({ success: false, message: "Module not found" });
    res.json({ success: true, data: mod });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch module" });
  }
}

async function create(req, res) {
  try {
    const { name, code, description } = req.body;
    const mod = await prisma.module.create({ data: { name, code, description } });
    res.status(201).json({ success: true, data: mod });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ success: false, message: "Module code already exists" });
    }
    res.status(500).json({ success: false, message: "Failed to create module" });
  }
}

async function update(req, res) {
  try {
    const { name, code, description } = req.body;
    const mod = await prisma.module.update({
      where: { id: Number(req.params.id) },
      data: { name, code, description },
    });
    res.json({ success: true, data: mod });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update module" });
  }
}

async function remove(req, res) {
  try {
    await prisma.module.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Module deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete module" });
  }
}

module.exports = { getAll, getOne, create, update, remove };
