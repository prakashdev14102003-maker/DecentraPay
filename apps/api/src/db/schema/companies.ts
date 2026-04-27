import { pgTable, uuid, text, char, pgEnum, numeric, timestamp } from "drizzle-orm/pg-core";

export const sectorEnum = pgEnum("sector", ["ENERGY", "TECH", "AGRI"]);
export const kycStatusEnum = pgEnum("kyc_status", ["NEW", "VERIFIED", "REJECTED"]);

export const companies = pgTable("companies", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    country: char("country", { length: 2 }).notNull().default("US"),
    sector: sectorEnum("sector").notNull(),
    ethAddress: char("eth_address", { length: 42 }).unique(),
    monthlyAllowanceKg: numeric("monthly_allowance_kg", {
        precision: 18,
        scale: 3,
    }).notNull(),
    kycStatus: kycStatusEnum("kyc_status").notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
