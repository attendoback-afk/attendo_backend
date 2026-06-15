const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

// GET /api/staff
async function getAll(req, res) {
  try {
    const staff = await prisma.staffMember.findMany({
      include: {
        user: { select: { fullName: true, email: true, invalid: true } },
        role: true,
      },
    });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch staff" });
  }
}

// GET /api/staff/:id
async function getOne(req, res) {
  try {
    const member = await prisma.staffMember.findUnique({
      where: { userId: Number(req.params.id) },
      include: { 
        user: { select: { fullName: true, email: true, invalid: true } },
        role: true,
      },
    });
    if (!member) return res.status(404).json({ success: false, message: "Staff not found" });
    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch staff" });
  }
}

// POST /api/staff
async function create(req, res) {
  try {
    const { fullName, email, password, role } = req.body;

    const validRoles = ["PROFESSOR", "MANAGER", "ASSISTANT"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) {
      return res.status(400).json({ success: false, message: "Role not found in DB" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const staff = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { fullName, email, passwordHash, invalid: false },
      });
      return tx.staffMember.create({
        data: { userId: user.id, roleId: roleRecord.id },
      });
    });

    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create staff" });
  }
}

// PUT /api/staff/:id
async function update(req, res) {
  try {
    const { role } = req.body;
    
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) {
      return res.status(400).json({ success: false, message: "Role not found in DB" });
    }

    const member = await prisma.staffMember.update({
      where: { userId: Number(req.params.id) },
      data: { roleId: roleRecord.id },
    });
    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update staff" });
  }
}

// DELETE /api/staff/:id
async function remove(req, res) {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Staff deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete staff" });
  }
}

module.exports = { getAll, getOne, create, update, remove };
