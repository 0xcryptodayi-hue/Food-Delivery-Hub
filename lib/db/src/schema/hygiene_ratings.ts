import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hygieneRatingsTable = pgTable("hygiene_ratings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  orderId: integer("order_id").notNull(),
  score: real("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHygieneRatingSchema = createInsertSchema(hygieneRatingsTable).omit({ id: true, createdAt: true });
export type InsertHygieneRating = z.infer<typeof insertHygieneRatingSchema>;
export type HygieneRating = typeof hygieneRatingsTable.$inferSelect;
