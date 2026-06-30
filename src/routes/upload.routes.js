const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middleware/auth.middleware");
const uploadController = require("../controllers/upload.controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and WEBP images are allowed"));
    }
    cb(null, true);
  },
});

router.post("/upload", authenticate, upload.single("image"), uploadController.handleUpload);

module.exports = router;
