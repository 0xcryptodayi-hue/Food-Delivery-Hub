import { Router } from "express";
import { db, supportTicketsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.post("/tickets", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { category, subject, message } = req.body;
    if (!category || !subject || !message) {
      res.status(400).json({ error: "Kategori, konu ve mesaj zorunludur" });
      return;
    }
    if (message.trim().length < 10) {
      res.status(400).json({ error: "Mesaj en az 10 karakter olmalıdır" });
      return;
    }

    const [ticket] = await db.insert(supportTicketsTable).values({
      userId: req.userId!,
      category,
      subject,
      message,
    }).returning();

    res.status(201).json(ticket);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/tickets", requireAuth, async (req: AuthRequest, res) => {
  try {
    const tickets = await db.select().from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, req.userId!))
      .orderBy(desc(supportTicketsTable.createdAt));
    res.json(tickets);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
