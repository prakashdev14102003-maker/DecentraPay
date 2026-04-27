import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { companies, wallets } from "../db/schema/index.js";

const router: Router = Router();

// GET /api/v1/companies/me — Get current company profile
router.get(
    "/me",
    authenticate,
    authorize("COMPANY"),
    async (req: Request, res: Response) => {
        try {
            if (!req.user?.companyId) {
                res.status(400).json({ success: false, error: "No company associated" });
                return;
            }

            const [company] = await db
                .select()
                .from(companies)
                .where(eq(companies.id, req.user.companyId))
                .limit(1);

            if (!company) {
                res.status(404).json({ success: false, error: "Company not found" });
                return;
            }

            // Get wallet
            const [wallet] = await db
                .select()
                .from(wallets)
                .where(eq(wallets.companyId, company.id))
                .limit(1);

            res.json({
                success: true,
                data: { company, wallet },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch company";
            res.status(500).json({ success: false, error: message });
        }
    }
);

export default router;
