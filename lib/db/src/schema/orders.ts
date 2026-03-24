import { pgTable, serial, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("received"),
  totalAmount: real("total_amount").notNull(),
  deliveryFee: real("delivery_fee").notNull().default(0),
  platformFee: real("platform_fee").notNull().default(0),
  sellerAmount: real("seller_amount").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  note: text("note"),
  deliveryAddress: text("delivery_address").notNull(),
  estimatedTime: integer("estimated_time"),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  items: jsonb("items").notNull().default([]),
  statusHistory: jsonb("status_history").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
