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
      "Tüm ürünleriniz listenin üstünde gösterilir",
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
      "Tüm ürünleriniz listenin üstünde gösterilir",
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
      "Tüm ürünleriniz listenin üstünde gösterilir",
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

    res.json(campaigns);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/apply", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { packageType, note, agreedToTerms } = req.body;

    if (!packageType || !agreedToTerms) {
      res.status(400).json({ error: "Paket seçimi ve kullanım koşulları onayı zorunludur" });
      return;
    }

    const pkg = AD_PACKAGES.find((p) => p.id === packageType);
    if (!pkg) {
      res.status(400).json({ error: "Geçersiz kampanya paketi" });
      return;
    }

    const existing = await db
      .select()
      .from(adCampaignsTable)
      .where(
        and(
          eq(adCampaignsTable.sellerId, req.userId!),
          eq(adCampaignsTable.status, "active")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Zaten aktif bir kampanyanız var" });
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

    const [campaign] = await db
      .insert(adCampaignsTable)
      .values({
        sellerId: req.userId!,
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

    // Mark ALL seller's products as sponsored
    await db
      .update(productsTable)
      .set({ isSponsored: true, updatedAt: new Date() })
      .where(eq(productsTable.sellerId, req.userId!));

    res.status(201).json({ campaign, message: "Kampanyanız başarıyla başlatıldı! Tüm ürünleriniz öne çıkanlar arasında gösterilecek." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
