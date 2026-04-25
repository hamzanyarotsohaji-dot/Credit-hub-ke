import { pgTable, serial, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";

export const bundlesTable = pgTable("bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'airtime' | 'data' | 'sms'
  amount: text("amount").notNull(), // e.g. "1GB", "500", "100MB + 50min"
  validity: text("validity"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Bundle = typeof bundlesTable.$inferSelect;
export type InsertBundle = typeof bundlesTable.$inferInsert;
