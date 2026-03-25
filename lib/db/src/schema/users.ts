import { pgTable, serial, text, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("buyer"),
  avatar: text("avatar"),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  bio: text("bio"),
  rating: real("rating"),
  reviewCount: integer("review_count").notNull().default(0),
  isSeller: boolean("is_seller").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  totalOrders: integer("total_orders").notNull().default(0),
  deliveryFee: real("delivery_fee").notNull().default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
