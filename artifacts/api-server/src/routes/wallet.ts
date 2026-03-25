import { Router } from "express";
import { db, walletTransactionsTable, ordersTable } from "@workspace/db";
import { eq, and, sum, ne } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sellerId = req.userId!;
    const transactions = await db.select().from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.sellerId, sellerId))
      .orderBy(walletTransactionsTable.createdAt);

    const [earnings] = await db.select({ total: sum(walletTransactionsTable.amount) })
      .from(walletTransactionsTable)
      .where(and(eq(walletTransactionsTable.sellerId, sellerId), eq(walletTransactionsTable.type, "earning")));
    const [pending] = await db.select({ total: sum(walletTransactionsTable.amount) })
      .from(walletTransactionsTable)
      .where(and(eq(walletTransactionsTable.sellerId, sellerId), eq(walletTransactionsTable.type, "pending")));
    const [withdrawn] = await db.select({ total: sum(walletTransactionsTable.amount) })
      .from(walletTransactionsTable)
      .where(and(eq(walletTransactionsTable.sellerId, sellerId), eq(walletTransactionsTable.type, "withdrawal")));

    const [commissionRow] = await db.select({ total: sum(ordersTable.platformFee) })
      .from(ordersTable)
      .where(and(eq(ordersTable.sellerId, sellerId), ne(ordersTable.status, "cancelled")));

    const totalEarnings = parseFloat(earnings?.total ?? "0");
    const pendingBalance = parseFloat(pending?.total ?? "0");
    const totalWithdrawn = parseFloat(withdrawn?.total ?? "0");
    const totalCommissionPaid = parseFloat(commissionRow?.total ?? "0");

    res.json({
      totalEarnings,
      pendingBalance,
      availableBalance: totalEarnings - totalWithdrawn,
      totalWithdrawn,
      platformFeePaid: totalCommissionPaid,
      commissionRate: 0.10,
      recentTransactions: transactions.slice(-20).map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
