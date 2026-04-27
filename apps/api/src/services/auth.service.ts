import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, companies, wallets } from "../db/schema/index.js";
import { config } from "../config.js";
import type { AuthPayload } from "../middleware/auth.js";
import type { Sector } from "@decentrapay/shared";

interface RegisterInput {
    email: string;
    password: string;
    company: {
        name: string;
        sector: Sector;
        country: string;
        ethAddress?: string;
        monthlyAllowanceKg: number;
    };
}

export async function registerCompany(input: RegisterInput) {
    // Hash password
    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

    // Create company
    const [company] = await db
        .insert(companies)
        .values({
            name: input.company.name,
            sector: input.company.sector,
            country: input.company.country,
            ethAddress: input.company.ethAddress || null,
            monthlyAllowanceKg: String(input.company.monthlyAllowanceKg),
        })
        .returning();

    // Create user
    const [user] = await db
        .insert(users)
        .values({
            email: input.email,
            passwordHash,
            role: "COMPANY",
            companyId: company.id,
        })
        .returning();

    // Create wallet
    await db.insert(wallets).values({
        companyId: company.id,
        ethAddress: company.ethAddress,
    });

    return {
        user: { id: user.id, email: user.email, role: user.role },
        company: { id: company.id, name: company.name, sector: company.sector },
    };
}

export async function login(email: string, password: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        throw new Error("Invalid email or password");
    }

    const payload: AuthPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtAccessExpiresIn,
    });

    const refreshToken = jwt.sign(
        { userId: user.id },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn }
    );

    return { accessToken, refreshToken, user: payload };
}

export async function refreshAccessToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
        userId: string;
    };

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

    if (!user) {
        throw new Error("User not found");
    }

    const payload: AuthPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtAccessExpiresIn,
    });

    const newRefreshToken = jwt.sign(
        { userId: user.id },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn }
    );

    return { accessToken, refreshToken: newRefreshToken, user: payload };
}
