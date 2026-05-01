import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../db/index.js";
import { submissions, emissions } from "../db/schema/index.js";
import { calculate } from "../services/calculation.engine.js";

const router: Router = Router();

// ─── Multer config for proof PDF uploads ───────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.resolve("uploads/proofs");
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    },
});

const activitiesSchema = z.object({
    activities: z.array(
        z.object({
            scope: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            activityType: z.string().min(1),
            activityValue: z.number().positive(),
            activityUnit: z.string().min(1),
        })
    ),
});

// POST /api/v1/submissions — Create a new submission for a period (with proof PDF upload)
router.post(
    "/",
    authenticate,
    authorize("COMPANY"),
    upload.single("proofDocument"),
    async (req: Request, res: Response) => {
        try {
            const companyId = req.user!.companyId!;
            const period = req.body.period;

            // Validate period format
            if (!period || !/^\d{6}$/.test(period)) {
                res.status(400).json({
                    success: false,
                    error: "Period must be in YYYYMM format",
                });
                return;
            }

            // Require proof document
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    error: "Proof PDF document is required",
                });
                return;
            }

            // Enforce C3: one submission per (company_id, period)
            const existing = await db
                .select()
                .from(submissions)
                .where(
                    and(
                        eq(submissions.companyId, companyId),
                        eq(submissions.period, period)
                    )
                )
                .limit(1);

            if (existing.length > 0) {
                // Clean up uploaded file on conflict
                if (req.file) fs.unlinkSync(req.file.path);
                res.status(409).json({
                    success: false,
                    error: `Submission for period ${period} already exists (one submission per month)`,
                });
                return;
            }

            // Compute SHA-256 hash of the uploaded PDF
            const fileBuffer = fs.readFileSync(req.file.path);
            const proofPdfHash = crypto
                .createHash("sha256")
                .update(fileBuffer)
                .digest("hex");

            // Move file to organized path: uploads/proofs/<companyId>/<period>.pdf
            const organizedDir = path.resolve("uploads/proofs", companyId);
            fs.mkdirSync(organizedDir, { recursive: true });
            const organizedPath = path.join(organizedDir, `${period}.pdf`);
            fs.renameSync(req.file.path, organizedPath);

            const proofPdfPath = `proofs/${companyId}/${period}.pdf`;

            const [submission] = await db
                .insert(submissions)
                .values({
                    companyId,
                    period,
                    factorLibraryVersion: "v2025.1",
                    proofPdfPath,
                    proofPdfHash,
                })
                .returning();

            res.status(201).json({ success: true, data: submission });
        } catch (err: unknown) {
            // Clean up uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            const message = err instanceof Error ? err.message : "Failed to create submission";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// GET /api/v1/submissions — List submissions for the current company
router.get(
    "/",
    authenticate,
    authorize("COMPANY", "VERIFIER", "ADMIN"),
    async (req: Request, res: Response) => {
        try {
            let query;
            if (req.user!.role === "COMPANY") {
                query = db
                    .select()
                    .from(submissions)
                    .where(eq(submissions.companyId, req.user!.companyId!))
                    .orderBy(submissions.createdAt);
            } else {
                query = db
                    .select()
                    .from(submissions)
                    .orderBy(submissions.createdAt);
            }

            const results = await query;
            res.json({ success: true, data: results });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch submissions";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// GET /api/v1/submissions/:id — Get a single submission with its emissions
router.get(
    "/:id",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const [submission] = await db
                .select()
                .from(submissions)
                .where(eq(submissions.id, req.params.id as string))
                .limit(1);

            if (!submission) {
                res.status(404).json({ success: false, error: "Submission not found" });
                return;
            }

            const emissionRows = await db
                .select()
                .from(emissions)
                .where(eq(emissions.submissionId, submission.id));

            res.json({
                success: true,
                data: { submission, emissions: emissionRows },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch submission";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// POST /api/v1/submissions/:id/activities — Add activities and run calculation
router.post(
    "/:id/activities",
    authenticate,
    authorize("COMPANY"),
    validate(activitiesSchema),
    async (req: Request, res: Response) => {
        try {
            const submissionId = req.params.id as string;

            // Get submission
            const [submission] = await db
                .select()
                .from(submissions)
                .where(eq(submissions.id, submissionId))
                .limit(1);

            if (!submission) {
                res.status(404).json({ success: false, error: "Submission not found" });
                return;
            }

            if (submission.companyId !== req.user!.companyId) {
                res.status(403).json({ success: false, error: "Not your submission" });
                return;
            }

            // Run the calculation engine (pure function)
            const result = calculate(
                req.body.activities,
                submission.factorLibraryVersion
            );

            // Persist emission rows
            const emissionInserts = result.emissions.map((e) => ({
                submissionId,
                scope: e.scope,
                activityType: e.activityType,
                activityValue: String(e.activityValue),
                activityUnit: e.activityUnit,
                gas: e.gas,
                emissionFactor: String(e.emissionFactor),
                gwp: String(e.gwp),
                emissionKg: String(e.emissionKg),
                factorSourceRef: e.factorSourceRef,
            }));

            if (emissionInserts.length > 0) {
                await db.insert(emissions).values(emissionInserts);
            }

            // Update submission totals
            await db
                .update(submissions)
                .set({
                    totalScope1Kg: String(result.totalScope1Kg),
                    totalScope2Kg: String(result.totalScope2Kg),
                    totalScope3Kg: String(result.totalScope3Kg),
                    totalKg: String(result.totalKg),
                })
                .where(eq(submissions.id, submissionId));

            res.json({ success: true, data: result });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Calculation failed";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// GET /api/v1/submissions/:id/calculation — Preview calculation without persist
router.get(
    "/:id/calculation",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const [submission] = await db
                .select()
                .from(submissions)
                .where(eq(submissions.id, req.params.id as string))
                .limit(1);

            if (!submission) {
                res.status(404).json({ success: false, error: "Submission not found" });
                return;
            }

            res.json({
                success: true,
                data: {
                    totalScope1Kg: submission.totalScope1Kg,
                    totalScope2Kg: submission.totalScope2Kg,
                    totalScope3Kg: submission.totalScope3Kg,
                    totalKg: submission.totalKg,
                    factorLibraryVersion: submission.factorLibraryVersion,
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch calculation";
            res.status(500).json({ success: false, error: message });
        }
    }
);

export default router;
