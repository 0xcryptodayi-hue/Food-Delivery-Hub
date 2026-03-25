import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, hashPassword, requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, avatar: user.avatar, storeImage: user.storeImage,
    address: user.address, lat: user.lat, lng: user.lng, rating: user.rating,
    reviewCount: user.reviewCount, isSeller: user.isSeller,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = hashPassword(password);
    const isSeller = role === "seller";
    const [user] = await db.insert(usersTable).values({
      name, email, phone, passwordHash,
      role: role || "buyer",
      isSeller,
    }).returning();
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, phone, address, avatar, storeImage, bio } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (avatar !== undefined) updates.avatar = avatar;
    if (storeImage !== undefined) updates.storeImage = storeImage;
    if (bio !== undefined) updates.bio = bio;

    const [user] = await db.update(usersTable)
      .set(updates as Partial<typeof usersTable.$inferInsert>)
      .where(eq(usersTable.id, req.userId!))
      .returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
