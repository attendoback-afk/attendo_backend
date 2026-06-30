require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 3000;
const PUBLIC_API_URL =
  process.env.PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? `https://attendobackend-production.up.railway.app/api`
    : `http://localhost:${PORT}/api`);
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.SWAGGER_URL,
  process.env.PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

// ─── Middleware ───────────────────────────────────────────────
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────
const routeDefinitions = [
  ["/api/auth", "./routes/auth.routes"],
  ["/api/students", "./routes/student.routes"],
  ["/api/staff", "./routes/staff.routes"],
  ["/api/departments", "./routes/department.routes"],
  ["/api/classes", "./routes/class.routes"],
  ["/api/modules", "./routes/module.routes"],
  ["/api/rooms", "./routes/room.routes"],
  ["/api/sessions", "./routes/session.routes"],
  ["/api/attendance", "./routes/attendance.routes"],
  ["/api/live", "./routes/liveAttendance.routes"],
];

let loadedRoutes = 0;
for (const [mountPath, routeModule] of routeDefinitions) {
  try {
    app.use(mountPath, require(routeModule));
    loadedRoutes++;
  } catch (err) {
    console.error(
      `[Routes] Failed to load route "${mountPath}" from "${routeModule}":`,
      err.message
    );
  }
}
console.log(`[Routes] ${loadedRoutes}/${routeDefinitions.length} route modules loaded successfully`);

// ─── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => res.json({ message: "Attendo API is running 🎓" }));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "healthy",
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong!" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`[Startup] Server is ready and accepting connections on port ${PORT}`);
});

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Attendo API",
      version: "1.0.0",
      description: "Attendo Backend API Documentation",
    },
    tags: [
      { name: "Auth", description: "Authentication and current user session" },
      { name: "Students", description: "Student lifecycle and biometric data" },
      { name: "Staff", description: "Staff administration" },
      { name: "Departments", description: "Academic departments" },
      { name: "Classes", description: "Class and class-module management" },
      { name: "Modules", description: "Course modules" },
      { name: "Rooms", description: "Physical rooms" },
      { name: "Sessions", description: "Scheduled academic sessions" },
      { name: "Attendance", description: "Manual attendance management" },
      {
        name: "Live Attendance",
        description: "QR-based live attendance sessions",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
        AuthLoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
          },
        },
        StudentCreateRequest: {
          type: "object",
          required: ["fullName", "email", "password", "studentCode", "classId"],
          properties: {
            fullName: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
            studentCode: { type: "string" },
            classId: { type: "integer", example: 1 },
          },
        },
        FaceEmbeddingRequest: {
          type: "object",
          required: ["embedding"],
          properties: {
            embedding: {
              type: "array",
              items: { type: "number" },
              description: "Face vector generated by the mobile app",
            },
          },
        },
        LiveStartRequest: {
          type: "object",
          properties: {
            sessionId: { type: "string", format: "uuid" },
            secret: { type: "string" },
            startTime: { type: "string", format: "date-time" },
          },
        },
        LiveJoinRequest: {
          type: "object",
          required: ["secret"],
          properties: {
            secret: {
              type: "string",
              description: "Active QR secret shown on screen",
            },
          },
        },
        LiveStartResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Live session started" },
            data: {
              type: "object",
              properties: {
                sessionId: { type: "string", format: "uuid" },
                secret: { type: "string", example: "A3F2" },
                startTime: { type: "string", format: "date-time" },
              },
            },
          },
        },
        LiveJoinResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Attendance marked successfully" },
            data: {
              type: "object",
              properties: {
                markedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
        LiveSessionRecordsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                session: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    status: { type: "string", example: "ACTIVE" },
                    startTime: { type: "string", format: "date-time" },
                    endTime: { type: "string", format: "date-time", nullable: true },
                    totalMarked: { type: "integer", example: 1 },
                  },
                },
                records: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      studentId: { type: "integer" },
                      attendanceSessionId: { type: "string", format: "uuid" },
                      markedAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        LiveSessionsListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  staffId: { type: "integer" },
                  secret: { type: "string" },
                  status: { type: "string", example: "ACTIVE" },
                  startTime: { type: "string", format: "date-time" },
                  endTime: { type: "string", format: "date-time", nullable: true },
                  createdAt: { type: "string", format: "date-time" },
                  _count: {
                    type: "object",
                    properties: {
                      markedAttendances: { type: "integer", example: 1 },
                    },
                  },
                },
              },
            },
          },
        },
        LiveCloseRequest: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    servers: [
      {
        url: PUBLIC_API_URL,
        description:
          process.env.NODE_ENV === "production" ? "Production" : "Local",
      },
    ],
  },
  apis: [path.resolve(__dirname, "routes/*.js").replace(/\\/g, "/")],
};

let specs = null;
try {
  specs = swaggerJsdoc(options);
  app.use("/api", swaggerUi.serve, swaggerUi.setup(specs));
  console.log("[Swagger] Documentation loaded successfully");
} catch (err) {
  console.error("[Swagger] Failed to generate docs:", err);
  app.get("/api", (req, res) => {
    res.status(503).json({
      success: false,
      message: "Swagger documentation is temporarily unavailable",
    });
  });
}

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException]", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[UnhandledRejection]", reason);
});
