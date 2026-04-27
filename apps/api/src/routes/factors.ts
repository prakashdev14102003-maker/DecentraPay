import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router: Router = Router();

// GET /api/v1/factors/:version — Get factor library
router.get("/:version", (req: Request, res: Response) => {
    try {
        const version = req.params.version;
        const filePath = path.join(
            __dirname,
            "../data/factor-library",
            `${version}.json`
        );

        if (!fs.existsSync(filePath)) {
            res.status(404).json({
                success: false,
                error: `Factor library version ${version} not found`,
            });
            return;
        }

        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        res.json({ success: true, data });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load factors";
        res.status(500).json({ success: false, error: message });
    }
});

// GET /api/v1/factors — List available versions
router.get("/", (_req: Request, res: Response) => {
    try {
        const dir = path.join(__dirname, "../data/factor-library");
        const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
        const versions = files.map((f) => f.replace(".json", ""));
        res.json({ success: true, data: versions });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to list factors";
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
