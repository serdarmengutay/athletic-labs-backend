import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import sequelize from "./config/database";

// Load environment variables (must be before Firebase import)
dotenv.config();

// Firebase Auth Middleware
import { authenticateFirebase } from "./middleware/firebaseAuth";

// Import routes
import clubRoutes from "./routes/clubs";
import athleteRoutes from "./routes/athletes";
import testRoutes from "./routes/tests";
// MVP CRUD routes
import testSessionRoutes from "./routes/testSessions";
import athleteTestRoutes from "./routes/athleteTests";
import historicalAthletesRoutes from "./routes/historicalAthletes";
import historicalTestsRoutes from "./routes/historicalTests";
import scoutingRoutes from "./routes/scouting";
// TODO MVP: commented out QR / station auth
// import qrRoutes from "./routes/qr";
// import stationRoutes from "./routes/station";
import authRoutes from "./routes/auth";
import excelRoutes from "./routes/excel";
import coachRoutes from "./routes/coaches";
import youjiuPushRoutes from "./routes/youjiuPush";

const app = express();
const PORT = process.env.PORT || 5017;
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(helmet());
app.use(compression());
// CORS configuration - Allow all origins in development
app.use(
  cors({
    origin:
      allowedOrigins.length > 0
        ? (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
              return;
            }
            callback(new Error("Not allowed by CORS"));
          }
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    optionsSuccessStatus: 200,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (public - no auth required)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API info endpoint (public - no auth required)
app.get("/api", (req: Request, res: Response) => {
  res.json({
    message: "Athletic Labs API",
    version: "1.0.0",
    status: "running",
  });
});

// Youjiu calls this endpoint from its own servers, so it must stay public.
app.use("/api/youjiu/push", youjiuPushRoutes);

// Apply Firebase auth middleware to all /api/* routes
// TODO: Add role/permission checks here when needed
app.use("/api", authenticateFirebase);

// Route handlers (all protected by Firebase auth)
// MVP CRUD routes
app.use("/api/test-sessions", testSessionRoutes);
app.use("/api/athlete-tests", athleteTestRoutes);
app.use("/api/historical-athletes", historicalAthletesRoutes);
app.use("/api/historical-tests", historicalTestsRoutes);
app.use("/api/scouting", scoutingRoutes);
// Legacy routes (will be deprecated)
app.use("/api/clubs", clubRoutes);
app.use("/api/athletes", athleteRoutes);
app.use("/api/tests", testRoutes);
// TODO MVP: commented out QR / station auth
// app.use("/api/qr", qrRoutes);
// app.use("/api/station", stationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/excel", excelRoutes);
app.use("/api/coaches", coachRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Sync database (only in development)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("✅ Database synchronized.");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

startServer();

export default app;
