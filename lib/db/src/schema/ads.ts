import { pgTable, serial, integer, text, real, timestamp, boolean } from "drizzle-orm/pg-core";

export const adCampaignsTable = pgTable("ad_campaigns", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  productId: integer("product_id"),
  packageType: text("package_type").notNull(), // "starter" | "standard" | "premium"
  durationDays: integer("duration_days").notNull(),
  price: real("price").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "active" | "expired" | "cancelled"
  note: text("note"),
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AdCampaign = typeof adCampaignsTable.$inferSelect;
