import { pgTable, uuid, numeric, char, timestamp } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const wallets = pgTable("wallets", {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
        .notNull()
        .unique()
        .references(() => companies.id),
    balanceCredits: numeric("balance_credits", { precision: 18, scale: 3 })
        .notNull()
        .default("0"),
    surplusCredits: numeric("surplus_credits", { precision: 18, scale: 3 })
        .notNull()
        .default("0"),
    deficitCredits: numeric("deficit_credits", { precision: 18, scale: 3 })
        .notNull()
        .default("0"),
    ethAddress: char("eth_address", { length: 42 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
