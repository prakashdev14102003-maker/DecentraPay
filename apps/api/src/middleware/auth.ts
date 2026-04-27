import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { Role } from "@decentrapay/shared";

export interface AuthPayload {
    userId: string;
    email: string;
    role: Role;
    companyId: string | null;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}

export function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ success: false, error: "Missing auth token" });
        return;
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
}

export function authorize(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Not authenticated" });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: "Insufficient permissions" });
            return;
        }
        next();
    };
}
