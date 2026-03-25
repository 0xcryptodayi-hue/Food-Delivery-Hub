import { Router } from "express";
import { db, usersTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: user.id, name: user.name, avatar: user.avatar, storeImage: user.storeImage,
      address: user.address, rating: user.rating, reviewCount: user.reviewCount,
      isSeller: user.isSeller, bio: user.bio, totalOrders: user.totalOrders,
      memberSince: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id/products", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const products = await db.select().from(productsTable)
      .where(and(eq(productsTable.sellerId, id), eq(productsTable.isAvailable, true)));
    const [seller] = await db.select({ name: usersTable.name, avatar: usersTable.avatar, rating: usersTable.rating })
      .from(usersTable).where(eq(usersTable.id, id)).limit(1);
    res.json(products.map(p => ({
      ...p, sellerName: seller?.name ?? "", sellerAvatar: seller?.avatar ?? null,
      sellerRating: seller?.rating ?? null, isSponsored: p.isSponsored, isFavorited: false,
      createdAt: p.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
