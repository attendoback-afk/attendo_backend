require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/auth",        require("./routes/auth.routes"));
app.use("/api/students",    require("./routes/student.routes"));
app.use("/api/staff",       require("./routes/staff.routes"));
app.use("/api/departments", require("./routes/department.routes"));
app.use("/api/classes",     require("./routes/class.routes"));
app.use("/api/modules",     require("./routes/module.routes"));
app.use("/api/rooms",       require("./routes/room.routes"));
app.use("/api/sessions",    require("./routes/session.routes"));
app.use("/api/attendance",  require("./routes/attendance.routes"));
app.use("/api/live",        require("./routes/liveAttendance.routes"));

// ─── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => res.json({ message: "Attendo API is running 🎓" }));

// ─── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
