const prisma = require("../utils/prisma");

async function getAll(req, res) {
  try {
    const rooms = await prisma.room.findMany();
    res.json({ success: true, data: rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch rooms" });
  }
}

async function create(req, res) {
  try {
    const room = await prisma.room.create({ data: { name: req.body.name } });
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create room" });
  }
}

async function update(req, res) {
  try {
    const room = await prisma.room.update({
      where: { id: Number(req.params.id) },
      data: { name: req.body.name },
    });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update room" });
  }
}

async function remove(req, res) {
  try {
    await prisma.room.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Room deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete room" });
  }
}

module.exports = { getAll, create, update, remove };
