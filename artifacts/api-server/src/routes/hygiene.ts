import { Router } from "express";
import { db, hygieneRatingsTable, ordersTable, usersTable } from "@workspace/db";
import { eq, avg, count, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

function computePlatformScore(decl: {
  hygieneWearsGloves: boolean;
  hygieneWearsBone: boolean;
  hygieneHasHealthCert: boolean;
  hygieneWashesHands: boolean;
  hygieneSingleUsePackaging: boolean;
  hygieneKitchenProtocol: boolean;
}): number {
  let score = 0;
  if (decl.hygieneWearsGloves) score += 1.0;
  if (decl.hygieneWearsBone) score += 1.0;
  if (decl.hygieneHasHealthCert) score += 1.25;
  if (decl.hygieneWashesHands) score += 0.5;
  if (decl.hygieneSingleUsePackaging) score += 0.75;
  if (decl.hygieneKitchenProtocol) score += 0.5;
  return Math.round(score * 10) / 10;
}

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

    const [seller] = await db.select({
      hygienePlatformScore: usersTable.hygienePlatformScore,
      hygieneWearsGloves: usersTable.hygieneWearsGloves,
      hygieneWearsBone: usersTable.hygieneWearsBone,
      hygieneHasHealthCert: usersTable.hygieneHasHealthCert,
      hygieneWashesHands: usersTable.hygieneWashesHands,
      hygieneSingleUsePackaging: usersTable.hygieneSingleUsePackaging,
      hygieneKitchenProtocol: usersTable.hygieneKitchenProtocol,
      hygieneNote: usersTable.hygieneNote,
      hygieneUpdatedAt: usersTable.hygieneUpdatedAt,
    }).from(usersTable).where(eq(usersTable.id, sellerId)).limit(1);

    res.json({
      sellerId,
      avgScore: result?.avgScore ? parseFloat(result.avgScore as string) : null,
      totalCount: Number(result?.totalCount ?? 0),
      platformScore: seller?.hygienePlatformScore ?? null,
      declarations: seller ? {
        wearsGloves: seller.hygieneWearsGloves,
        wearsBone: seller.hygieneWearsBone,
        hasHealthCert: seller.hygieneHasHealthCert,
        washesHands: seller.hygieneWashesHands,
        singleUsePackaging: seller.hygieneSingleUsePackaging,
        kitchenProtocol: seller.hygieneKitchenProtocol,
        note: seller.hygieneNote,
        updatedAt: seller.hygieneUpdatedAt,
      } : null,
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

router.get("/declaration", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [seller] = await db.select({
      hygieneWearsGloves: usersTable.hygieneWearsGloves,
      hygieneWearsBone: usersTable.hygieneWearsBone,
      hygieneHasHealthCert: usersTable.hygieneHasHealthCert,
      hygieneWashesHands: usersTable.hygieneWashesHands,
      hygieneSingleUsePackaging: usersTable.hygieneSingleUsePackaging,
      hygieneKitchenProtocol: usersTable.hygieneKitchenProtocol,
      hygieneNote: usersTable.hygieneNote,
      hygienePlatformScore: usersTable.hygienePlatformScore,
      hygieneUpdatedAt: usersTable.hygieneUpdatedAt,
    }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    if (!seller) {
      res.status(404).json({ error: "Kullanıcı bulunamadı" });
      return;
    }

    res.json({
      wearsGloves: seller.hygieneWearsGloves,
      wearsBone: seller.hygieneWearsBone,
      hasHealthCert: seller.hygieneHasHealthCert,
      washesHands: seller.hygieneWashesHands,
      singleUsePackaging: seller.hygieneSingleUsePackaging,
      kitchenProtocol: seller.hygieneKitchenProtocol,
      note: seller.hygieneNote,
      platformScore: seller.hygienePlatformScore,
      updatedAt: seller.hygieneUpdatedAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.put("/declaration", requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      wearsGloves = false,
      wearsBone = false,
      hasHealthCert = false,
      washesHands = false,
      singleUsePackaging = false,
      kitchenProtocol = false,
      note = null,
    } = req.body;

    const platformScore = computePlatformScore({
      hygieneWearsGloves: !!wearsGloves,
      hygieneWearsBone: !!wearsBone,
      hygieneHasHealthCert: !!hasHealthCert,
      hygieneWashesHands: !!washesHands,
      hygieneSingleUsePackaging: !!singleUsePackaging,
      hygieneKitchenProtocol: !!kitchenProtocol,
    });

    await db.update(usersTable).set({
      hygieneWearsGloves: !!wearsGloves,
      hygieneWearsBone: !!wearsBone,
      hygieneHasHealthCert: !!hasHealthCert,
      hygieneWashesHands: !!washesHands,
      hygieneSingleUsePackaging: !!singleUsePackaging,
      hygieneKitchenProtocol: !!kitchenProtocol,
      hygieneNote: note ?? null,
      hygienePlatformScore: platformScore,
      hygieneUpdatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, req.userId!));

    res.json({ platformScore });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
