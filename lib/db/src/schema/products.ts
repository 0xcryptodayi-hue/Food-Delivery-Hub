import { pgTable, serial, text, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  portion: text("portion").notNull(),
  dailyStock: integer("daily_stock").notNull().default(10),
  remainingStock: integer("remaining_stock").notNull().default(10),
  prepTime: integer("prep_time").notNull().default(30),
  isAvailable: boolean("is_available").notNull().default(true),
  rating: real("rating"),
  reviewCount: integer("review_count").notNull().default(0),
  sellerId: integer("seller_id").notNull(),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
export type Category = typeof categoriesTable.$inferSelect;
