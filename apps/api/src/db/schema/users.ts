import { pgTable, uuid, text, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const roleEnum = pgEnum("role", ["COMPANY", "VERIFIER", "ADMIN"]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("COMPANY"),
    companyId: uuid("company_id").references(() => companies.id),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
