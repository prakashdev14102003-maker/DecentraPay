import {
    pgTable,
    uuid,
    text,
    char,
    pgEnum,
    numeric,
    timestamp,
    unique,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const submissionStatusEnum = pgEnum("submission_status", [
    "PENDING",
    "VERIFIED",
    "REJECTED",
]);

export const submissions = pgTable(
    "submissions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        period: char("period", { length: 6 }).notNull(), // YYYYMM
        status: submissionStatusEnum("status").notNull().default("PENDING"),
        factorLibraryVersion: text("factor_library_version").notNull(),
        totalScope1Kg: numeric("total_scope1_kg", { precision: 18, scale: 3 }),
        totalScope2Kg: numeric("total_scope2_kg", { precision: 18, scale: 3 }),
        totalScope3Kg: numeric("total_scope3_kg", { precision: 18, scale: 3 }),
        totalKg: numeric("total_kg", { precision: 18, scale: 3 }),
        proofPdfPath: text("proof_pdf_path"),
        proofPdfHash: char("proof_pdf_hash", { length: 64 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [unique("uq_company_period").on(t.companyId, t.period)]
);
