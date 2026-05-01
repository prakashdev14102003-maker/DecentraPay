import {
    pgTable,
    uuid,
    pgEnum,
    numeric,
    timestamp,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const orderSideEnum = pgEnum("order_side", ["BUY", "SELL"]);
export const orderStatusEnum = pgEnum("order_status", [
    "OPEN",
    "PARTIALLY_FILLED",
    "FILLED",
    "CANCELLED",
]);

export const orders = pgTable("orders", {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
        .notNull()
        .references(() => companies.id),
    side: orderSideEnum("side").notNull(),
    price: numeric("price", { precision: 18, scale: 4 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull(),
    remaining: numeric("remaining", { precision: 18, scale: 3 }).notNull(),
    status: orderStatusEnum("status").notNull().default("OPEN"),
    placedAt: timestamp("placed_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
