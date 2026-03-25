import { Router } from "express";
import { db, productsTable, usersTable, favoritesTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, sql, desc, or, inArray } from "drizzle-orm";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/categories", async (req, res) => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.id);
    res.json(cats);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sellers", optionalAuth, async (req: AuthRequest, res) => {
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

router.get("/", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { search, category, sellerId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(productsTable.isAvailable, true)];
    if (search) conditions.push(or(ilike(productsTable.title, `%${search}%`), ilike(productsTable.description, `%${search}%`))!);
    if (category) conditions.push(eq(productsTable.category, category));
    if (sellerId) conditions.push(eq(productsTable.sellerId, parseInt(sellerId)));

    const whereClause = and(...conditions);
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(productsTable).where(whereClause);
    const rows = await db.select().from(productsTable).where(whereClause)
      .orderBy(desc(productsTable.isSponsored), desc(productsTable.createdAt))
      .limit(limitNum).offset(offset);

    const favSet = new Set<number>();
    if (req.userId) {
      const favs = await db.select({ productId: favoritesTable.productId }).from(favoritesTable).where(eq(favoritesTable.userId, req.userId));
      favs.forEach(f => favSet.add(f.productId));
    }

    const sellerIds = [...new Set(rows.map(r => r.sellerId))];
    const sellers = sellerIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, rating: usersTable.rating }).from(usersTable).where(inArray(usersTable.id, sellerIds))
      : [];
    const sellerMap = new Map(sellers.map(s => [s.id, s]));

    const products = rows.map(p => {
      const seller = sellerMap.get(p.sellerId);
      return {
        id: p.id, title: p.title, description: p.description, price: p.price,
        imageUrl: p.imageUrl, category: p.category, portion: p.portion,
        dailyStock: p.dailyStock, remainingStock: p.remainingStock,
        prepTime: p.prepTime, isAvailable: p.isAvailable, rating: p.rating,
        reviewCount: p.reviewCount, sellerId: p.sellerId,
        sellerName: seller?.name ?? "Unknown", sellerAvatar: seller?.avatar ?? null,
        sellerRating: seller?.rating ?? null,
        isSponsored: p.isSponsored, isFavorited: favSet.has(p.id),
        discountPercent: p.discountPercent ?? null,
        createdAt: p.createdAt.toISOString(),
      };
    });

    res.json({ products, total: Number(total), page: pageNum, totalPages: Math.ceil(Number(total) / limitNum) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const [seller] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, rating: usersTable.rating, address: usersTable.address })
      .from(usersTable).where(eq(usersTable.id, product.sellerId)).limit(1);

    let isFavorited = false;
    if (req.userId) {
      const [fav] = await db.select().from(favoritesTable)
        .where(and(eq(favoritesTable.userId, req.userId), eq(favoritesTable.productId, id))).limit(1);
      isFavorited = !!fav;
    }

    res.json({
      id: product.id, title: product.title, description: product.description, price: product.price,
      imageUrl: product.imageUrl, category: product.category, portion: product.portion,
      dailyStock: product.dailyStock, remainingStock: product.remainingStock,
      prepTime: product.prepTime, isAvailable: product.isAvailable, rating: product.rating,
      reviewCount: product.reviewCount, sellerId: product.sellerId,
      sellerName: seller?.name ?? "Unknown", sellerAvatar: seller?.avatar ?? null,
      sellerRating: seller?.rating ?? null, sellerAddress: seller?.address ?? null,
      isSponsored: product.isSponsored, isFavorited, reviews: [],
      discountPercent: product.discountPercent ?? null,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, description, price, imageUrl, category, portion, dailyStock, prepTime } = req.body;
    const [product] = await db.insert(productsTable).values({
      title, description, price: parseFloat(price), imageUrl, category, portion,
      dailyStock: parseInt(dailyStock), remainingStock: parseInt(dailyStock),
      prepTime: parseInt(prepTime), sellerId: req.userId!,
    }).returning();
    const [seller] = await db.select({ name: usersTable.name, avatar: usersTable.avatar, rating: usersTable.rating })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    res.status(201).json({
      ...product, sellerName: seller?.name ?? "", sellerAvatar: seller?.avatar ?? null,
      sellerRating: seller?.rating ?? null, isFavorited: false, createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product || product.sellerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const updates: Record<string, unknown> = {};
    const fields = ["title", "description", "price", "imageUrl", "category", "portion", "dailyStock", "prepTime", "isAvailable", "discountPercent"] as const;
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updatedAt = new Date();
    const [updated] = await db.update(productsTable).set(updates as Partial<typeof productsTable.$inferInsert>).where(eq(productsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product || product.sellerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
