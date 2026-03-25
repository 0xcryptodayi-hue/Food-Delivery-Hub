import { Router } from "express";
import { db, productsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { optionalAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const sellers = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      avatar: usersTable.avatar,
      rating: usersTable.rating,
      reviewCount: usersTable.reviewCount,
      address: usersTable.address,
    }).from(usersTable).where(eq(usersTable.isSeller, true));

    const withCounts = await Promise.all(sellers.map(async (s) => {
      const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(productsTable)
        .where(and(eq(productsTable.sellerId, s.id), eq(productsTable.isAvailable, true)));
      return { ...s, distance: null, productCount: Number(countRow?.count ?? 0), isSponsored: false };
    }));
    res.json(withCounts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
