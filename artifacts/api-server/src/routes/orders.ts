import { Router } from "express";
import { db, ordersTable, productsTable, usersTable, walletTransactionsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const PLATFORM_FEE_RATE = 0.10;
const DELIVERY_FEE = 15;

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, status } = req.query as Record<string, string>;
    const conditions = role === "seller"
      ? [eq(ordersTable.sellerId, req.userId!)]
      : [eq(ordersTable.buyerId, req.userId!)];
    if (status) conditions.push(eq(ordersTable.status, status));

    const rows = await db.select().from(ordersTable).where(and(...conditions))
      .orderBy(ordersTable.createdAt);

    const userIds = [...new Set([...rows.map(r => r.buyerId), ...rows.map(r => r.sellerId)])];
    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(or(...userIds.map(id => eq(usersTable.id, id))))
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json(rows.map(o => ({
      ...o,
      buyerName: userMap.get(o.buyerId)?.name ?? "Unknown",
      sellerName: userMap.get(o.sellerId)?.name ?? "Unknown",
      items: o.items as unknown[],
      statusHistory: o.statusHistory as unknown[],
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, note, sellerId } = req.body;
    if (!items?.length || !deliveryAddress || !sellerId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const orderItems: Array<{ productId: number; productTitle: string; price: number; quantity: number; imageUrl: string | null }> = [];
    let subtotal = 0;

    for (const item of items) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
      if (!product) { res.status(400).json({ error: `Product ${item.productId} not found` }); return; }
      if (product.remainingStock < item.quantity) {
        res.status(400).json({ error: `Insufficient stock for ${product.title}` }); return;
      }
      orderItems.push({ productId: product.id, productTitle: product.title, price: product.price, quantity: item.quantity, imageUrl: product.imageUrl });
      subtotal += product.price * item.quantity;
      await db.update(productsTable).set({ remainingStock: product.remainingStock - item.quantity }).where(eq(productsTable.id, product.id));
    }

    const deliveryFee = DELIVERY_FEE;
    const totalAmount = subtotal + deliveryFee;
    const platformFee = parseFloat((subtotal * PLATFORM_FEE_RATE).toFixed(2));
    const sellerAmount = parseFloat((subtotal - platformFee).toFixed(2));

    const statusHistory = [{ status: "received", timestamp: new Date().toISOString() }];

    const [order] = await db.insert(ordersTable).values({
      status: "received", totalAmount, deliveryFee, platformFee, sellerAmount,
      paymentMethod: paymentMethod || "cash", note, deliveryAddress,
      estimatedTime: 45, buyerId: req.userId!, sellerId: parseInt(sellerId),
      items: orderItems, statusHistory,
    }).returning();

    await db.insert(walletTransactionsTable).values({
      sellerId: parseInt(sellerId), type: "pending", amount: sellerAmount,
      description: `Sipariş #${order.id} - bekleniyor`, orderId: order.id,
    });

    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, parseInt(sellerId))).limit(1);

    res.status(201).json({
      ...order, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "",
      items: orderItems, statusHistory,
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.buyerId !== req.userId && order.sellerId !== req.userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const [buyer] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, order.buyerId)).limit(1);
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId)).limit(1);
    res.json({
      ...order, buyerName: buyer?.name ?? "", buyerPhone: buyer?.phone ?? null, sellerName: seller?.name ?? "",
      items: order.items as unknown[], statusHistory: order.statusHistory as unknown[],
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, estimatedTime, note } = req.body;
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.sellerId !== req.userId && order.buyerId !== req.userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const history = (order.statusHistory as Array<{ status: string; timestamp: string; note?: string }>) || [];
    history.push({ status, timestamp: new Date().toISOString(), note });

    const updates: Parameters<typeof db.update<typeof ordersTable>>[0] extends unknown ? Record<string, unknown> : never = {};
    updates.status = status;
    updates.statusHistory = history;
    updates.updatedAt = new Date();
    if (estimatedTime !== undefined) updates.estimatedTime = estimatedTime;

    if (status === "delivered") {
      await db.update(walletTransactionsTable).set({ type: "earning" })
        .where(and(eq(walletTransactionsTable.orderId, id), eq(walletTransactionsTable.type, "pending")));
    }

    const [updated] = await db.update(ordersTable).set(updates as Parameters<typeof db.update>[0] extends unknown ? never : never).where(eq(ordersTable.id, id)).returning();
    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId)).limit(1);
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId)).limit(1);
    res.json({
      ...updated, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "",
      items: updated.items as unknown[], statusHistory: updated.statusHistory as unknown[],
      createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
