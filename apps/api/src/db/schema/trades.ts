import { pgTable, uuid, numeric, char, timestamp } from "drizzle-orm/pg-core";
import { orders } from "./orders.js";

export const trades = pgTable("trades", {
    id: uuid("id").defaultRandom().primaryKey(),
    buyOrderId: uuid("buy_order_id")
        .notNull()
        .references(() => orders.id),
    sellOrderId: uuid("sell_order_id")
        .notNull()
        .references(() => orders.id),
    price: numeric("price", { precision: 18, scale: 4 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull(),
    royaltyPaid: numeric("royalty_paid", { precision: 18, scale: 4 })
        .notNull()
        .default("0"),
    platformFee: numeric("platform_fee", { precision: 18, scale: 4 })
        .notNull()
        .default("0"),
    txHash: char("tx_hash", { length: 66 }),
    executedAt: timestamp("executed_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
