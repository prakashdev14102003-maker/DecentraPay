import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../db/index.js";
import { submissions, emissions } from "../db/schema/index.js";
import { calculate } from "../services/calculation.engine.js";

const router: Router = Router();

const createSubmissionSchema = z.object({
    period: z.string().regex(/^\d{6}$/, "Period must be YYYYMM format"),
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

// POST /api/v1/submissions — Create a new submission for a period
router.post(
    "/",
    authenticate,
    authorize("COMPANY"),
    validate(createSubmissionSchema),
    async (req: Request, res: Response) => {
        try {
            const companyId = req.user!.companyId!;
            const { period } = req.body;

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
                res.status(409).json({
                    success: false,
                    error: `Submission for period ${period} already exists`,
                });
                return;
            }

            const [submission] = await db
                .insert(submissions)
                .values({
                    companyId,
                    period,
                    factorLibraryVersion: "v2025.1",
                })
                .returning();

            res.status(201).json({ success: true, data: submission });
        } catch (err: unknown) {
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
