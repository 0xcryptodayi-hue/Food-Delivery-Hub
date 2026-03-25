import { Router } from "express";
import { db, hygieneRatingsTable, ordersTable, usersTable } from "@workspace/db";
import { eq, avg, count, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sellerId, orderId, score, comment } = req.body;
    if (!sellerId || !orderId || !score) {
      res.status(400).json({ error: "sellerId, orderId ve score zorunludur" });
      return;
    }
    if (score < 1 || score > 5) {
      res.status(400).json({ error: "Puan 1-5 arasında olmalıdır" });
      return;
    }

    const [order] = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.buyerId, req.userId!)))
      .limit(1);

    if (!order) {
      res.status(403).json({ error: "Bu siparişi değerlendirme yetkiniz yok" });
      return;
    }
    if (order.status !== "delivered") {
      res.status(400).json({ error: "Yalnızca teslim edilen siparişler değerlendirilebilir" });
      return;
    }

    const existing = await db.select({ id: hygieneRatingsTable.id })
      .from(hygieneRatingsTable)
      .where(and(eq(hygieneRatingsTable.orderId, orderId), eq(hygieneRatingsTable.buyerId, req.userId!)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Bu sipariş için zaten hijyen değerlendirmesi yapılmış" });
      return;
    }

    const [rating] = await db.insert(hygieneRatingsTable).values({
      sellerId,
      buyerId: req.userId!,
      orderId,
      score,
      comment: comment ?? null,
    }).returning();

    res.status(201).json(rating);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/seller/:sellerId", async (req, res) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    if (!sellerId) { res.status(400).json({ error: "Geçersiz satıcı ID" }); return; }

    const [result] = await db.select({
      avgScore: avg(hygieneRatingsTable.score),
      totalCount: count(hygieneRatingsTable.id),
    }).from(hygieneRatingsTable).where(eq(hygieneRatingsTable.sellerId, sellerId));

    res.json({
      sellerId,
      avgScore: result?.avgScore ? parseFloat(result.avgScore as string) : null,
      totalCount: Number(result?.totalCount ?? 0),
    });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/check/:orderId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const existing = await db.select({ id: hygieneRatingsTable.id })
      .from(hygieneRatingsTable)
      .where(and(eq(hygieneRatingsTable.orderId, orderId), eq(hygieneRatingsTable.buyerId, req.userId!)))
      .limit(1);
    res.json({ rated: existing.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
