import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bundleId: integer("bundle_id").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  payerPhone: text("payer_phone").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | failed
  mpesaCode: text("mpesa_code"),
  merchantRequestId: text("merchant_request_id"),
  checkoutRequestId: text("checkout_request_id"),
  resultDesc: text("result_desc"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
