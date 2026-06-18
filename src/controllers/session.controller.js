const prisma = require("../utils/prisma");

// GET /api/sessions
async function getAll(req, res) {
  try {
    // ممكن تفلتر بـ classId أو moduleId
    const { classId, moduleId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (moduleId) where.moduleId = Number(moduleId);

    const sessions = await prisma.session.findMany({
      where,
      include: {
        class: true,
        module: true,
        room: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    res.json({ success: true, data: sessions });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch sessions" });
  }
}

// GET /api/sessions/:id
async function getOne(req, res) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: Number(req.params.id) },
      include: { class: true, module: true, room: true },
    });
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    res.json({ success: true, data: session });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch session" });
  }
}

// POST /api/sessions
async function create(req, res) {
  try {
    const { classId, moduleId, roomId, dayOfWeek, startTime, endTime } =
      req.body;

    const session = await prisma.session.create({
      data: {
        classId: Number(classId),
        moduleId: Number(moduleId),
        roomId: Number(roomId),
        dayOfWeek: Number(dayOfWeek),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      include: { class: true, module: true, room: true },
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error(err); // add this — you're currently swallowing the real error
    res
      .status(500)
      .json({ success: false, message: "Failed to create session" });
  }
}

// PUT /api/sessions/:id
// PUT /api/sessions/:id
async function update(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session id" });
    }

    const { classId, moduleId, roomId, dayOfWeek, startTime, endTime } =
      req.body;

    // build data object with only the fields actually provided
    const data = {};
    if (classId !== undefined) data.classId = Number(classId);
    if (moduleId !== undefined) data.moduleId = Number(moduleId);
    if (roomId !== undefined) data.roomId = Number(roomId);
    if (dayOfWeek !== undefined) data.dayOfWeek = Number(dayOfWeek);
    if (startTime !== undefined) data.startTime = new Date(startTime);
    if (endTime !== undefined) data.endTime = new Date(endTime);

    // catch bad numbers/dates before they hit Prisma
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "number" && Number.isNaN(val)) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid value for ${key}` });
      }
      if (val instanceof Date && isNaN(val.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid date for ${key}` });
      }
    }

    const session = await prisma.session.update({
      where: { id },
      data,
      include: { class: true, module: true, room: true },
    });

    res.json({ success: true, data: session });
  } catch (err) {
    console.error(err);
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to update session" });
  }
}

// DELETE /api/sessions/:id
async function remove(req, res) {
  try {
    await prisma.session.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Session deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete session" });
  }
}

module.exports = { getAll, getOne, create, update, remove };
