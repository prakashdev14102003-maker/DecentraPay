import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import * as authService from "../services/auth.service.js";

const router: Router = Router();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(10, "Password must be at least 10 characters"),
    company: z.object({
        name: z.string().min(1),
        sector: z.enum(["ENERGY", "TECH", "AGRI"]),
        country: z.string().length(2),
        ethAddress: z.string().optional(),
        monthlyAllowanceKg: z.number().positive(),
    }),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

// POST /api/v1/auth/register
router.post(
    "/register",
    validate(registerSchema),
    async (req: Request, res: Response) => {
        try {
            const result = await authService.registerCompany(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Registration failed";
            const status = message.includes("unique") ? 409 : 500;
            res.status(status).json({ success: false, error: message });
        }
    }
);

// POST /api/v1/auth/login
router.post(
    "/login",
    validate(loginSchema),
    async (req: Request, res: Response) => {
        try {
            const result = await authService.login(req.body.email, req.body.password);
            res.json({ success: true, data: result });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Login failed";
            res.status(401).json({ success: false, error: message });
        }
    }
);

// POST /api/v1/auth/refresh
router.post(
    "/refresh",
    validate(refreshSchema),
    async (req: Request, res: Response) => {
        try {
            const result = await authService.refreshAccessToken(req.body.refreshToken);
            res.json({ success: true, data: result });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Token refresh failed";
            res.status(401).json({ success: false, error: message });
        }
    }
);

export default router;
