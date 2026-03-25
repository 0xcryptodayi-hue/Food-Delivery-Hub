import { Router } from "express";
import { db, reviewsTable, usersTable, productsTable } from "@workspace/db";
import { eq, avg, count, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { rating, comment, sellerId, orderId, productId } = req.body;
    if (!rating || !sellerId) {
      res.status(400).json({ error: "Rating and sellerId are required" });
      return;
    }
    const [review] = await db.insert(reviewsTable).values({
      rating: parseInt(rating), comment, buyerId: req.userId!,
      sellerId: parseInt(sellerId),
      orderId: orderId ? parseInt(orderId) : null,
      productId: productId ? parseInt(productId) : undefined,
    }).returning();

    const [agg] = await db.select({ avg: avg(reviewsTable.rating), count: count(reviewsTable.id) })
      .from(reviewsTable).where(eq(reviewsTable.sellerId, parseInt(sellerId)));
    if (agg) {
      await db.update(usersTable).set({
        rating: parseFloat(Number(agg.avg).toFixed(1)),
        reviewCount: Number(agg.count),
      }).where(eq(usersTable.id, parseInt(sellerId)));
    }

    if (productId) {
      const [pagg] = await db.select({ avg: avg(reviewsTable.rating), count: count(reviewsTable.id) })
        .from(reviewsTable).where(eq(reviewsTable.productId, parseInt(productId)));
      if (pagg) {
        await db.update(productsTable).set({
          rating: parseFloat(Number(pagg.avg).toFixed(1)),
          reviewCount: Number(pagg.count),
        }).where(eq(productsTable.id, parseInt(productId)));
      }
    }

    const [buyer] = await db.select({ name: usersTable.name, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    res.status(201).json({
      ...review, buyerName: buyer?.name ?? "Unknown", buyerAvatar: buyer?.avatar ?? null,
      createdAt: review.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/product/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const rows = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, productId))
      .orderBy(reviewsTable.createdAt);

    const buyerIds = [...new Set(rows.map(r => r.buyerId))];
    const buyers = buyerIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
        .from(usersTable).where(inArray(usersTable.id, buyerIds))
      : [];
    const buyerMap = new Map(buyers.map(b => [b.id, b]));

    res.json(rows.map(r => ({
      ...r, buyerName: buyerMap.get(r.buyerId)?.name ?? "Unknown",
      buyerAvatar: buyerMap.get(r.buyerId)?.avatar ?? null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/seller/:sellerId", async (req, res) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const rows = await db.select().from(reviewsTable).where(eq(reviewsTable.sellerId, sellerId))
      .orderBy(reviewsTable.createdAt);

    const buyerIds = [...new Set(rows.map(r => r.buyerId))];
    const buyers = buyerIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
        .from(usersTable).where(inArray(usersTable.id, buyerIds))
      : [];
    const buyerMap = new Map(buyers.map(b => [b.id, b]));

    res.json(rows.map(r => ({
      ...r, buyerName: buyerMap.get(r.buyerId)?.name ?? "Unknown",
      buyerAvatar: buyerMap.get(r.buyerId)?.avatar ?? null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
