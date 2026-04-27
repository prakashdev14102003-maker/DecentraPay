import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../db/index.js";
import { submissions, verifications, wallets, companies } from "../db/schema/index.js";
import { config } from "../config.js";

const router = Router();

// POST /api/v1/submissions/:id/audit — Upload audit PDF
router.post(
    "/submissions/:id/audit",
    authenticate,
    authorize("COMPANY"),
    async (req: Request, res: Response) => {
        try {
            const submissionId = req.params.id;

            const [submission] = await db
                .select()
                .from(submissions)
                .where(eq(submissions.id, submissionId))
                .limit(1);

            if (!submission) {
                res.status(404).json({ success: false, error: "Submission not found" });
                return;
            }

            // For now, accept JSON body with auditor total and PDF hash
            // In production, this would be multipart file upload
            const { auditorTotalKg, auditPdfHash, auditPdfPath } = req.body;

            const pdfHash = auditPdfHash || crypto.randomBytes(32).toString("hex");

            const [verification] = await db
                .insert(verifications)
                .values({
                    submissionId,
                    auditPdfPath: auditPdfPath || null,
                    auditPdfHash: pdfHash,
                    auditorTotalKg: String(auditorTotalKg),
                    tolerancePct: String(config.defaultTolerancePct),
                })
                .returning();

            res.status(201).json({ success: true, data: verification });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Audit upload failed";
            res.status(500).json({ success: false, error: message });
        }
    }
);

const decideSchema = z.object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().optional(),
});

// GET /api/v1/verifier/queue — List pending submissions
router.get(
    "/queue",
    authenticate,
    authorize("VERIFIER", "ADMIN"),
    async (req: Request, res: Response) => {
        try {
            const pending = await db
                .select()
                .from(verifications)
                .where(eq(verifications.decision, "PENDING"));

            res.json({ success: true, data: pending });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch queue";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// POST /api/v1/verifier/decide/:id — Approve or reject a submission
router.post(
    "/decide/:id",
    authenticate,
    authorize("VERIFIER", "ADMIN"),
    validate(decideSchema),
    async (req: Request, res: Response) => {
        try {
            const verificationId = req.params.id;
            const { decision, reason } = req.body;

            // Rejection requires reason >= 20 chars
            if (decision === "REJECTED" && (!reason || reason.length < 20)) {
                res.status(400).json({
                    success: false,
                    error: "Rejection reason must be at least 20 characters",
                });
                return;
            }

            const [verification] = await db
                .select()
                .from(verifications)
                .where(eq(verifications.id, verificationId))
                .limit(1);

            if (!verification) {
                res.status(404).json({ success: false, error: "Verification not found" });
                return;
            }

            if (verification.decision !== "PENDING") {
                res.status(400).json({
                    success: false,
                    error: `Verification already ${verification.decision}`,
                });
                return;
            }

            // Get the submission
            const [submission] = await db
                .select()
                .from(submissions)
                .where(eq(submissions.id, verification.submissionId))
                .limit(1);

            if (!submission) {
                res.status(404).json({ success: false, error: "Submission not found" });
                return;
            }

            // Check tolerance if approving
            if (decision === "APPROVED" && verification.auditorTotalKg && submission.totalKg) {
                const calcTotal = parseFloat(submission.totalKg);
                const auditorTotal = parseFloat(verification.auditorTotalKg);
                const tolerance = parseFloat(verification.tolerancePct);
                const diff = Math.abs(calcTotal - auditorTotal) / calcTotal * 100;

                if (diff > tolerance) {
                    res.status(400).json({
                        success: false,
                        error: `Tolerance check failed. Difference: ${diff.toFixed(2)}% exceeds ${tolerance}% threshold`,
                    });
                    return;
                }
            }

            // Update verification
            await db
                .update(verifications)
                .set({
                    decision,
                    reason: reason || null,
                    verifierId: req.user!.userId,
                    decidedAt: new Date(),
                })
                .where(eq(verifications.id, verificationId));

            // Update submission status
            const submissionStatus = decision === "APPROVED" ? "VERIFIED" : "REJECTED";
            await db
                .update(submissions)
                .set({ status: submissionStatus as "VERIFIED" | "REJECTED" })
                .where(eq(submissions.id, verification.submissionId));

            // If approved, update wallet (surplus / deficit)
            if (decision === "APPROVED" && submission.totalScope1Kg && submission.totalScope2Kg) {
                const [company] = await db
                    .select()
                    .from(companies)
                    .where(eq(companies.id, submission.companyId))
                    .limit(1);

                if (company) {
                    const allowance = parseFloat(company.monthlyAllowanceKg);
                    const totalS1S2 =
                        parseFloat(submission.totalScope1Kg) +
                        parseFloat(submission.totalScope2Kg);

                    const surplus = Math.max(allowance - totalS1S2, 0);
                    const deficit = Math.max(totalS1S2 - allowance, 0);

                    const [wallet] = await db
                        .select()
                        .from(wallets)
                        .where(eq(wallets.companyId, company.id))
                        .limit(1);

                    if (wallet) {
                        const currentBalance = parseFloat(wallet.balanceCredits);
                        await db
                            .update(wallets)
                            .set({
                                surplusCredits: String(surplus),
                                deficitCredits: String(deficit),
                                balanceCredits: String(currentBalance + surplus),
                                updatedAt: new Date(),
                            })
                            .where(eq(wallets.companyId, company.id));
                    }
                }
            }

            res.json({ success: true, data: { decision, submissionStatus } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Decision failed";
            res.status(500).json({ success: false, error: message });
        }
    }
);

export default router;
