const uploadService = require("../services/upload.service");

async function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const folder = req.body.folder || "general";
    const result = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      folder,
      req.file.mimetype,
    );

    return res.status(200).json({
      success: true,
      data: result,
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
  handleUpload,
};
