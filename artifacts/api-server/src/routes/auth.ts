import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, hashPassword, requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

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
    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, phone: user.phone,
        role: user.role, avatar: user.avatar, address: user.address,
        lat: user.lat, lng: user.lng, rating: user.rating,
        reviewCount: user.reviewCount, isSeller: user.isSeller,
        createdAt: user.createdAt.toISOString(),
      },
    });
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
    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, phone: user.phone,
        role: user.role, avatar: user.avatar, address: user.address,
        lat: user.lat, lng: user.lng, rating: user.rating,
        reviewCount: user.reviewCount, isSeller: user.isSeller,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, avatar: user.avatar, address: user.address,
      lat: user.lat, lng: user.lng, rating: user.rating,
      reviewCount: user.reviewCount, isSeller: user.isSeller,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
