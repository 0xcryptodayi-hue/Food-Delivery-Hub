import { Router } from "express";
import { db, adCampaignsTable, productsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

export const AD_PACKAGES = [
  {
    id: "starter",
    name: "Başlangıç",
    durationDays: 7,
    price: 199,
    description: "7 gün öne çıkma",
    features: [
      "Ürününüz listenin üstünde gösterilir",
      "Öne Çıkan rozeti",
      "7 gün süre",
    ],
    color: "#4CAF50",
  },
  {
    id: "standard",
    name: "Standart",
    durationDays: 14,
    price: 399,
    description: "14 gün öne çıkma",
    features: [
      "Ürününüz listenin üstünde gösterilir",
      "Öne Çıkan rozeti",
      "14 gün süre",
      "Kategori sayfasında vurgulama",
    ],
    color: "#E8651A",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    durationDays: 30,
    price: 799,
    description: "30 gün öne çıkma",
    features: [
      "Ürününüz listenin üstünde gösterilir",
      "Öne Çıkan rozeti",
      "30 gün süre",
      "Kategori sayfasında vurgulama",
      "Satıcı profilinde öncelikli sıralama",
    ],
    color: "#8B5CF6",
  },
];

router.get("/packages", (_req, res) => {
  res.json(AD_PACKAGES);
});

router.get("/my-campaigns", requireAuth, async (req: AuthRequest, res) => {
  try {
    const campaigns = await db
      .select()
      .from(adCampaignsTable)
      .where(eq(adCampaignsTable.sellerId, req.userId!))
      .orderBy(desc(adCampaignsTable.createdAt));

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const [product] = await db
          .select({ title: productsTable.title, imageUrl: productsTable.imageUrl })
          .from(productsTable)
          .where(eq(productsTable.id, c.productId))
          .limit(1);
        return { ...c, productTitle: product?.title ?? "Ürün", productImage: product?.imageUrl ?? null };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/apply", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { productId, packageType, note, agreedToTerms } = req.body;

    if (!productId || !packageType || !agreedToTerms) {
      res.status(400).json({ error: "Ürün, paket ve kullanım koşulları onayı zorunludur" });
      return;
    }

    const pkg = AD_PACKAGES.find((p) => p.id === packageType);
    if (!pkg) {
      res.status(400).json({ error: "Geçersiz kampanya paketi" });
      return;
    }

    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, parseInt(productId)), eq(productsTable.sellerId, req.userId!)))
      .limit(1);

    if (!product) {
      res.status(403).json({ error: "Bu ürün size ait değil veya bulunamadı" });
      return;
    }

    const existing = await db
      .select()
      .from(adCampaignsTable)
      .where(
        and(
          eq(adCampaignsTable.productId, parseInt(productId)),
          eq(adCampaignsTable.status, "active")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Bu ürün zaten aktif bir kampanyaya sahip" });
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

    const [campaign] = await db
      .insert(adCampaignsTable)
      .values({
        sellerId: req.userId!,
        productId: parseInt(productId),
        packageType,
        durationDays: pkg.durationDays,
        price: pkg.price,
        status: "active",
        note: note || null,
        agreedToTerms: true,
        startDate,
        endDate,
      })
      .returning();

    await db
      .update(productsTable)
      .set({ isSponsored: true, updatedAt: new Date() })
      .where(eq(productsTable.id, parseInt(productId)));

    res.status(201).json({ campaign, message: "Kampanyanız başarıyla başlatıldı!" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
