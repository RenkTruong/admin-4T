import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import {
  createOrder,
  createReview,
  getAdminMetrics,
  getAllOrders,
  getLoyaltyAccount,
  getOrdersForUser,
  getPublicStats,
  getRecentSupportMessages,
  getSupportThread,
  postSupportMessage,
  recordVisit,
  updateOrderStatus,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { calculateEstimatedTotal, getCustomerDisplayOrderCount, ORDER_STATUSES } from "./orderRules";

const orderInput = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(32),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  pickupAddress: z.string().trim().min(8).max(1000),
  pickupWindow: z.string().trim().min(3).max(80),
  serviceTier: z.enum(["standard", "express"]),
  estimatedKg: z.number().int().min(1).max(100),
  notes: z.string().trim().max(1200).optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "ewallet"]),
});

function generateOrderCode() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `4T-${day}${month}${year}-${random}`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  storefront: router({
    stats: publicProcedure.query(async ({ ctx }) => {
      const visits = await getPublicStats();
      if (ctx.user) {
        const userStats = await getPublicStats(ctx.user.id);
        return { visits: visits.visits, orders: userStats.orders };
      }
      return { visits: visits.visits, orders: getCustomerDisplayOrderCount(visits.visits, 0, false) };
    }),
    visit: publicProcedure.input(z.object({ visitorKey: z.string().min(12).max(64) })).mutation(({ input }) => recordVisit(input.visitorKey)),
    createOrder: publicProcedure.input(orderInput).mutation(({ ctx, input }) => {
      const paymentStatus = input.paymentMethod === "cash" ? "cash_on_delivery" : input.paymentMethod === "bank_transfer" ? "awaiting_transfer" : "awaiting_wallet";
      return createOrder({
        ...input,
        userId: ctx.user?.id,
        customerEmail: input.customerEmail || undefined,
        publicCode: generateOrderCode(),
        paymentStatus,
        estimatedTotalVnd: calculateEstimatedTotal(input.estimatedKg, input.serviceTier),
      });
    }),
  }),
  account: router({
    orders: protectedProcedure.query(({ ctx }) => getOrdersForUser(ctx.user.id)),
    loyalty: protectedProcedure.query(({ ctx }) => getLoyaltyAccount(ctx.user.id)),
    review: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1200).optional() })).mutation(({ ctx, input }) => createReview(ctx.user.id, input.orderId, input.rating, input.comment)),
  }),
  support: router({
    thread: publicProcedure.input(z.object({ threadKey: z.string().min(16).max(48) })).query(({ input }) => getSupportThread(input.threadKey)),
    send: publicProcedure.input(z.object({ threadKey: z.string().min(16).max(48), visitorName: z.string().trim().max(120).optional(), contact: z.string().trim().max(120).optional(), body: z.string().trim().min(1).max(1500) })).mutation(({ ctx, input }) => postSupportMessage({ ...input, userId: ctx.user?.id, sender: "visitor" })),
  }),
  admin: router({
    metrics: adminProcedure.query(() => getAdminMetrics()),
    orders: adminProcedure.query(() => getAllOrders()),
    support: adminProcedure.query(() => getRecentSupportMessages()),
    updateOrder: adminProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(ORDER_STATUSES), note: z.string().trim().max(255).optional() })).mutation(({ input }) => updateOrderStatus(input.orderId, input.status, input.note)),
    replySupport: adminProcedure.input(z.object({ threadKey: z.string().min(16).max(48), body: z.string().trim().min(1).max(1500) })).mutation(({ input }) => postSupportMessage({ ...input, sender: "staff" })),
  }),
});

export type AppRouter = typeof appRouter;
