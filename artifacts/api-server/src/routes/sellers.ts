import { Router } from "express";
import { db, productsTable, usersTable, hygieneRatingsTable } from "@workspace/db";
import { eq, and, sql, avg, count } from "drizzle-orm";
import { optionalAuth, requireAuth, type AuthRequest } from "../lib/auth.js";

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
      deliveryFee: usersTable.deliveryFee,
    }).from(usersTable).where(eq(usersTable.isSeller, true));

    const withCounts = await Promise.all(sellers.map(async (s) => {
      const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(productsTable)
        .where(and(eq(productsTable.sellerId, s.id), eq(productsTable.isAvailable, true)));
      const [hygieneRow] = await db.select({
        avgScore: avg(hygieneRatingsTable.score),
        totalCount: count(hygieneRatingsTable.id),
      }).from(hygieneRatingsTable).where(eq(hygieneRatingsTable.sellerId, s.id));
      return {
        ...s,
        distance: null,
        productCount: Number(countRow?.count ?? 0),
        isSponsored: false,
        hygieneAvg: hygieneRow?.avgScore ? parseFloat(hygieneRow.avgScore as string) : null,
        hygieneCount: Number(hygieneRow?.totalCount ?? 0),
      };
    }));
    res.json(withCounts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [seller] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      deliveryFee: usersTable.deliveryFee,
      rating: usersTable.rating,
      reviewCount: usersTable.reviewCount,
    }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }
    res.json(seller);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/delivery-fee", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { deliveryFee } = req.body;
    if (deliveryFee === undefined || deliveryFee === null) {
      res.status(400).json({ error: "deliveryFee is required" });
      return;
    }
    const fee = parseFloat(deliveryFee);
    if (isNaN(fee) || fee < 0 || fee > 500) {
      res.status(400).json({ error: "deliveryFee must be between 0 and 500" });
      return;
    }

    const [updated] = await db.update(usersTable)
      .set({ deliveryFee: fee, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!))
      .returning({ deliveryFee: usersTable.deliveryFee });

    res.json({ deliveryFee: updated.deliveryFee });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
