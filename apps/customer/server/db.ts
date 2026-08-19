import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  laundryOrders,
  loyaltyAccounts,
  loyaltyTransactions,
  orderReviews,
  orderStatusHistory,
  siteVisits,
  supportMessages,
  users,
} from "../drizzle/schema";
import { calculateOrderPoints, OrderStatus } from "./orderRules";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

type CreateOrderData = {
  publicCode: string;
  userId?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  pickupWindow: string;
  serviceTier: "standard" | "express";
  estimatedKg: number;
  notes?: string;
  paymentMethod: "cash" | "bank_transfer" | "ewallet";
  paymentStatus: "cash_on_delivery" | "awaiting_transfer" | "awaiting_wallet";
  estimatedTotalVnd: number;
};

export async function createOrder(data: CreateOrderData) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối dữ liệu đơn hàng.");
  await db.insert(laundryOrders).values({
    ...data,
    userId: data.userId ?? null,
    customerEmail: data.customerEmail || null,
    notes: data.notes || null,
    status: "requested",
    pointsAwarded: 0,
  });
  const order = await db.select().from(laundryOrders).where(eq(laundryOrders.publicCode, data.publicCode)).limit(1);
  if (!order[0]) throw new Error("Không thể lưu đơn hàng.");
  await db.insert(orderStatusHistory).values({ orderId: order[0].id, status: "requested", note: "Đơn đang chờ cửa hàng xác nhận." });
  return order[0];
}

async function hydrateOrders(orderRows: Awaited<ReturnType<typeof getRawOrders>>) {
  const db = await getDb();
  if (!db) return [];
  return Promise.all(orderRows.map(async order => {
    const [history, review] = await Promise.all([
      db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)).orderBy(desc(orderStatusHistory.createdAt)),
      db.select().from(orderReviews).where(eq(orderReviews.orderId, order.id)).limit(1),
    ]);
    return { ...order, history: history.reverse(), review: review[0] ?? null };
  }));
}

async function getRawOrders(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  return userId
    ? db.select().from(laundryOrders).where(eq(laundryOrders.userId, userId)).orderBy(desc(laundryOrders.createdAt))
    : db.select().from(laundryOrders).orderBy(desc(laundryOrders.createdAt)).limit(100);
}

export async function getOrdersForUser(userId: number) {
  return hydrateOrders(await getRawOrders(userId));
}

export async function getAllOrders() {
  return hydrateOrders(await getRawOrders());
}

export async function updateOrderStatus(orderId: number, status: OrderStatus, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("Không thể cập nhật đơn hàng.");
  const current = await db.select().from(laundryOrders).where(eq(laundryOrders.id, orderId)).limit(1);
  const order = current[0];
  if (!order) throw new Error("Không tìm thấy đơn hàng.");

  const award = status === "completed" && order.userId && order.pointsAwarded === 0
    ? calculateOrderPoints(order.estimatedTotalVnd)
    : 0;
  await db.update(laundryOrders).set({ status, pointsAwarded: order.pointsAwarded + award }).where(eq(laundryOrders.id, orderId));
  await db.insert(orderStatusHistory).values({ orderId, status, note: note || null });

  if (award > 0 && order.userId) {
    await db.insert(loyaltyAccounts).values({ userId: order.userId, currentPoints: award, totalEarned: award }).onDuplicateKeyUpdate({
      set: {
        currentPoints: sql`${loyaltyAccounts.currentPoints} + ${award}`,
        totalEarned: sql`${loyaltyAccounts.totalEarned} + ${award}`,
      },
    });
    await db.insert(loyaltyTransactions).values({ userId: order.userId, orderId, kind: "earn", points: award, note: `Tích điểm đơn ${order.publicCode}` });
  }
  return { ...order, status, pointsAwarded: order.pointsAwarded + award };
}

export async function getLoyaltyAccount(userId: number) {
  const db = await getDb();
  if (!db) return { currentPoints: 0, totalEarned: 0, transactions: [] };
  const [account, transactions] = await Promise.all([
    db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.userId, userId)).limit(1),
    db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.userId, userId)).orderBy(desc(loyaltyTransactions.createdAt)),
  ]);
  return { currentPoints: account[0]?.currentPoints ?? 0, totalEarned: account[0]?.totalEarned ?? 0, transactions };
}

export async function createReview(userId: number, orderId: number, rating: number, comment?: string) {
  const db = await getDb();
  if (!db) throw new Error("Không thể gửi đánh giá.");
  const order = await db.select().from(laundryOrders).where(and(eq(laundryOrders.id, orderId), eq(laundryOrders.userId, userId))).limit(1);
  if (!order[0] || order[0].status !== "completed") throw new Error("Chỉ đánh giá đơn đã hoàn tất thuộc tài khoản của bạn.");
  await db.insert(orderReviews).values({ orderId, userId, rating, comment: comment || null });
}

export async function recordVisit(visitorKey: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteVisits).values({ visitorKey }).onDuplicateKeyUpdate({ set: { visitorKey } });
}

export async function getPublicStats() {
  const db = await getDb();
  if (!db) return { visits: 0, orders: 0 };
  const [visitRows, orderRows] = await Promise.all([
    db.select({ value: count() }).from(siteVisits),
    db.select({ value: count() }).from(laundryOrders),
  ]);
  return { visits: Number(visitRows[0]?.value ?? 0), orders: Number(orderRows[0]?.value ?? 0) };
}

export async function getAdminMetrics() {
  const db = await getDb();
  if (!db) return { visits: 0, orders: 0, averageRating: 0, pending: 0 };
  const [stats, statusRows, ratingRows] = await Promise.all([
    getPublicStats(),
    db.select({ value: count() }).from(laundryOrders).where(eq(laundryOrders.status, "requested")),
    db.select({ value: avg(orderReviews.rating) }).from(orderReviews),
  ]);
  return { ...stats, pending: Number(statusRows[0]?.value ?? 0), averageRating: Number(ratingRows[0]?.value ?? 0) };
}

export async function postSupportMessage(input: { threadKey: string; userId?: number; visitorName?: string; contact?: string; sender: "visitor" | "staff"; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể gửi tin nhắn.");
  await db.insert(supportMessages).values({ ...input, userId: input.userId ?? null, visitorName: input.visitorName || null, contact: input.contact || null });
}

export async function getSupportThread(threadKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportMessages).where(eq(supportMessages.threadKey, threadKey)).orderBy(supportMessages.createdAt);
}

export async function getRecentSupportMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportMessages).orderBy(desc(supportMessages.createdAt)).limit(200);
}
