const prisma = require("../utils/prisma");
const uploadService = require("../services/upload.service");

async function registerFace(req, res) {
  try {
    const studentId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const folder = `student-faces/${studentId}`;
    const { path: imagePath, publicUrl } = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      folder,
      req.file.mimetype,
    );

    await prisma.studentImage.create({
      data: {
        studentId,
        imageUrl: imagePath,
      },
    });

    await prisma.student.update({
      where: {
        userId: studentId,
      },
      data: {
        imageUrl: imagePath,
        faceRegistered: true,
      },
    });

    return res.json({
      success: true,
      message: "Face registered successfully",
      data: {
        path: imagePath,
        publicUrl,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

async function registerEmbedding(req, res) {
  try {
    const studentId = req.user.userId;
    const { embedding } = req.body;

    if (!embedding) {
      return res.status(400).json({
        success: false,
        message: "Embedding is required",
      });
    }

    await prisma.faceEmbedding.create({
      data: {
        studentId,
        embedding: JSON.stringify(embedding),
      },
    });

    return res.json({
      success: true,
      message: "Embedding saved successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

async function getMyFace(req, res) {
  try {
    const studentId = req.user.userId;

    const student = await prisma.student.findUnique({
      where: {
        userId: studentId,
      },
      include: {
        images: true,
      },
    });

    const embedding = await prisma.faceEmbedding.findFirst({
      where: {
        studentId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      student,
      embedding,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  registerFace,
  registerEmbedding,
  getMyFace,
};
