import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { wallets } from "../db/schema/index.js";

const router = Router();

// GET /api/v1/wallets/me — Get current company's wallet
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

            const [wallet] = await db
                .select()
                .from(wallets)
                .where(eq(wallets.companyId, req.user.companyId))
                .limit(1);

            if (!wallet) {
                res.status(404).json({ success: false, error: "Wallet not found" });
                return;
            }

            res.json({ success: true, data: wallet });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch wallet";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// GET /api/v1/wallets/:companyId — Get a specific company's wallet
router.get(
    "/:companyId",
    authenticate,
    authorize("COMPANY", "VERIFIER", "ADMIN"),
    async (req: Request, res: Response) => {
        try {
            const [wallet] = await db
                .select()
                .from(wallets)
                .where(eq(wallets.companyId, req.params.companyId))
                .limit(1);

            if (!wallet) {
                res.status(404).json({ success: false, error: "Wallet not found" });
                return;
            }

            res.json({ success: true, data: wallet });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch wallet";
            res.status(500).json({ success: false, error: message });
        }
    }
);

export default router;
