import {
    pgTable,
    uuid,
    text,
    char,
    pgEnum,
    numeric,
    timestamp,
} from "drizzle-orm/pg-core";
import { submissions } from "./submissions.js";
import { users } from "./users.js";

export const verificationDecisionEnum = pgEnum("verification_decision", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);

export const verifications = pgTable("verifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
        .notNull()
        .unique()
        .references(() => submissions.id),
    verifierId: uuid("verifier_id").references(() => users.id),
    auditPdfPath: text("audit_pdf_path"),
    auditPdfHash: char("audit_pdf_hash", { length: 64 }).notNull(),
    auditorTotalKg: numeric("auditor_total_kg", { precision: 18, scale: 3 }),
    tolerancePct: numeric("tolerance_pct", { precision: 5, scale: 2 })
        .notNull()
        .default("2.00"),
    decision: verificationDecisionEnum("decision").notNull().default("PENDING"),
    reason: text("reason"),
    chainTxHash: char("chain_tx_hash", { length: 66 }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
});
