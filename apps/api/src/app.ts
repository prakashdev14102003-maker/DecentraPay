import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config.js";

// Routes
import authRoutes from "./routes/auth.js";
import companyRoutes from "./routes/companies.js";
import submissionRoutes from "./routes/submissions.js";
import verifierRoutes from "./routes/verifier.js";
import walletRoutes from "./routes/wallets.js";
import marketplaceRoutes from "./routes/marketplace.js";
import factorRoutes from "./routes/factors.js";

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Serve uploaded proof documents
app.use("/uploads", express.static(path.resolve("uploads")));

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/verifier", verifierRoutes);
app.use("/api/v1/wallets", walletRoutes);
app.use("/api/v1/marketplace", marketplaceRoutes);
app.use("/api/v1/factors", factorRoutes);

export default app;
