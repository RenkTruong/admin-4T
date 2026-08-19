import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core account identity supplied by the authentication layer. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const laundryOrders = mysqlTable(
  "laundryOrders",
  {
    id: int("id").autoincrement().primaryKey(),
    publicCode: varchar("publicCode", { length: 32 }).notNull(),
    userId: int("userId"),
    customerName: varchar("customerName", { length: 120 }).notNull(),
    customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
    customerEmail: varchar("customerEmail", { length: 320 }),
    pickupAddress: text("pickupAddress").notNull(),
    pickupWindow: varchar("pickupWindow", { length: 80 }).notNull(),
    serviceTier: mysqlEnum("serviceTier", ["standard", "express"]).default("standard").notNull(),
    estimatedKg: int("estimatedKg").notNull(),
    notes: text("notes"),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "ewallet"]).notNull(),
    paymentStatus: mysqlEnum("paymentStatus", ["cash_on_delivery", "awaiting_transfer", "awaiting_wallet", "paid"]).notNull(),
    status: mysqlEnum("status", ["requested", "confirmed", "pickup", "washing", "drying", "ready", "completed", "cancelled"]).default("requested").notNull(),
    estimatedTotalVnd: int("estimatedTotalVnd").notNull(),
    pointsAwarded: int("pointsAwarded").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("laundry_orders_public_code_uq").on(table.publicCode),
    index("laundry_orders_user_idx").on(table.userId),
    index("laundry_orders_status_idx").on(table.status),
  ],
);

export const orderStatusHistory = mysqlTable(
  "orderStatusHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId").notNull(),
    status: mysqlEnum("status", ["requested", "confirmed", "pickup", "washing", "drying", "ready", "completed", "cancelled"]).notNull(),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("order_history_order_idx").on(table.orderId)],
);

export const loyaltyAccounts = mysqlTable(
  "loyaltyAccounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    currentPoints: int("currentPoints").default(0).notNull(),
    totalEarned: int("totalEarned").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("loyalty_account_user_uq").on(table.userId)],
);

export const loyaltyTransactions = mysqlTable(
  "loyaltyTransactions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    orderId: int("orderId"),
    kind: mysqlEnum("kind", ["earn", "redeem", "adjust"]).notNull(),
    points: int("points").notNull(),
    note: varchar("note", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("loyalty_tx_user_idx").on(table.userId), index("loyalty_tx_order_idx").on(table.orderId)],
);

export const orderReviews = mysqlTable(
  "orderReviews",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId").notNull(),
    userId: int("userId"),
    rating: int("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("order_review_order_uq").on(table.orderId), index("order_review_user_idx").on(table.userId)],
);

export const supportMessages = mysqlTable(
  "supportMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    threadKey: varchar("threadKey", { length: 48 }).notNull(),
    userId: int("userId"),
    visitorName: varchar("visitorName", { length: 120 }),
    contact: varchar("contact", { length: 120 }),
    sender: mysqlEnum("sender", ["visitor", "staff"]).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("support_thread_idx").on(table.threadKey), index("support_created_idx").on(table.createdAt)],
);

export const siteVisits = mysqlTable(
  "siteVisits",
  {
    id: int("id").autoincrement().primaryKey(),
    visitorKey: varchar("visitorKey", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("site_visit_visitor_uq").on(table.visitorKey)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LaundryOrder = typeof laundryOrders.$inferSelect;
