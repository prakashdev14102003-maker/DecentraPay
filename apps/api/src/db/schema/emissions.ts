import {
    pgTable,
    uuid,
    text,
    smallint,
    numeric,
} from "drizzle-orm/pg-core";
import { submissions } from "./submissions.js";

export const emissions = pgTable("emissions", {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
        .notNull()
        .references(() => submissions.id),
    scope: smallint("scope").notNull(), // 1, 2, or 3
    activityType: text("activity_type").notNull(),
    activityValue: numeric("activity_value", { precision: 18, scale: 3 }).notNull(),
    activityUnit: text("activity_unit").notNull(),
    gas: text("gas").notNull(), // CO2, CH4_fossil, CH4_bio, N2O
    emissionFactor: numeric("emission_factor", { precision: 18, scale: 9 }).notNull(),
    gwp: numeric("gwp", { precision: 10, scale: 3 }).notNull(),
    emissionKg: numeric("emission_kg", { precision: 18, scale: 3 }).notNull(),
    factorSourceRef: text("factor_source_ref"),
});
