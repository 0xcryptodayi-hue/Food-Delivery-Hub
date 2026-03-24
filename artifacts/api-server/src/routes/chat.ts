import { Router } from "express";
import { db, conversationsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, or, desc, sql, ne, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/conversations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const convs = await db.select().from(conversationsTable)
      .where(or(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, userId)))
      .orderBy(desc(conversationsTable.lastMessageAt));

    const otherIds = convs.map(c => c.user1Id === userId ? c.user2Id : c.user1Id);
    const others = otherIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
        .from(usersTable).where(inArray(usersTable.id, otherIds))
      : [];
    const otherMap = new Map(others.map(u => [u.id, u]));

    const result = await Promise.all(convs.map(async c => {
      const otherId = c.user1Id === userId ? c.user2Id : c.user1Id;
      const [unread] = await db.select({ count: sql<number>`count(*)` }).from(messagesTable)
        .where(and(eq(messagesTable.conversationId, c.id), eq(messagesTable.isRead, false), ne(messagesTable.senderId, userId)));
      return {
        id: c.id,
        otherUser: otherMap.get(otherId) ?? { id: otherId, name: "Unknown", avatar: null },
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        unreadCount: Number(unread?.count ?? 0),
      };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/conversations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.userId!;
    const min = Math.min(userId, otherUserId);
    const max = Math.max(userId, otherUserId);
    const [existing] = await db.select().from(conversationsTable)
      .where(and(eq(conversationsTable.user1Id, min), eq(conversationsTable.user2Id, max))).limit(1);

    const conv = existing ?? (await db.insert(conversationsTable).values({ user1Id: min, user2Id: max }).returning())[0];
    const [otherUser] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
    res.json({
      id: conv.id, otherUser: otherUser ?? { id: otherUserId, name: "Unknown", avatar: null },
      lastMessage: conv.lastMessage, lastMessageAt: conv.lastMessageAt?.toISOString() ?? null, unreadCount: 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const convId = parseInt(req.params.id);
    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.createdAt);
    await db.update(messagesTable).set({ isRead: true })
      .where(and(eq(messagesTable.conversationId, convId), ne(messagesTable.senderId, req.userId!)));
    res.json(messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const convId = parseInt(req.params.id);
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "Content required" }); return; }
    const [message] = await db.insert(messagesTable).values({
      conversationId: convId, senderId: req.userId!, content, isRead: false,
    }).returning();
    await db.update(conversationsTable).set({ lastMessage: content, lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, convId));
    res.status(201).json({ ...message, createdAt: message.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
