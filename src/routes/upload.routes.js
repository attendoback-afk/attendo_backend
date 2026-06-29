import express from "express";
import upload from "../middleware/upload.js";
import { uploadStudentImage } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/", upload.single("image"), uploadStudentImage);

export default router;