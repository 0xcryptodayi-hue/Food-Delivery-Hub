import { Router } from "express";
import { db, favoritesTable, productsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const favs = await db.select({ productId: favoritesTable.productId })
      .from(favoritesTable).where(eq(favoritesTable.userId, req.userId!));
    if (!favs.length) { res.json([]); return; }

    const productIds = favs.map(f => f.productId);
    const products = await db.select().from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const sellerIds = [...new Set(products.map(p => p.sellerId))];
    const sellers = sellerIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, rating: usersTable.rating })
        .from(usersTable).where(inArray(usersTable.id, sellerIds))
      : [];
    const sellerMap = new Map(sellers.map(s => [s.id, s]));

    res.json(products.map(p => {
      const seller = sellerMap.get(p.sellerId);
      return {
        id: p.id, title: p.title, description: p.description, price: p.price,
        imageUrl: p.imageUrl, category: p.category, portion: p.portion,
        dailyStock: p.dailyStock, remainingStock: p.remainingStock,
        prepTime: p.prepTime, isAvailable: p.isAvailable, rating: p.rating,
        reviewCount: p.reviewCount, sellerId: p.sellerId,
        sellerName: seller?.name ?? "Unknown", sellerAvatar: seller?.avatar ?? null,
        sellerRating: seller?.rating ?? null, isSponsored: p.isSponsored, isFavorited: true,
        createdAt: p.createdAt.toISOString(),
      };
    }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.body;
    const [existing] = await db.select().from(favoritesTable)
      .where(and(eq(favoritesTable.userId, req.userId!), eq(favoritesTable.productId, productId))).limit(1);
    if (existing) {
      await db.delete(favoritesTable).where(and(eq(favoritesTable.userId, req.userId!), eq(favoritesTable.productId, productId)));
      res.json({ isFavorited: false, productId });
    } else {
      await db.insert(favoritesTable).values({ userId: req.userId!, productId });
      res.json({ isFavorited: true, productId });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
