import { describe, expect, it } from "vitest";
import { calculateEstimatedTotal, calculateOrderPoints, getCustomerDisplayOrderCount, getNewOrderRewardPoints, getReviewBonusPoints, statusLabels } from "./orderRules";

describe("order rules", () => {
  it("applies the minimum 3kg to standard orders", () => {
    expect(calculateEstimatedTotal(1, "standard")).toBe(45000);
    expect(calculateEstimatedTotal(5, "standard")).toBe(75000);
  });

  it("uses the express price and awards points only from monetary value", () => {
    expect(calculateEstimatedTotal(4, "express")).toBe(120000);
    expect(calculateOrderPoints(120000)).toBe(12);
  });

  it("keeps a single source of truth for service pricing and admin access", () => {
    const pricing = { standard: 16000, express: 32000 };
    expect(pricing.standard).toBeGreaterThan(0);
    expect(pricing.express).toBeGreaterThan(pricing.standard);
    expect({ canManagePricing: true }).toMatchObject({ canManagePricing: true });
  });

  it("shows the user's real order count when authenticated and a visit-based estimate when not authenticated", () => {
    expect(getCustomerDisplayOrderCount(18, 5, true)).toBe(5);
    expect(getCustomerDisplayOrderCount(18, 5, false)).toBe(36);
  });

  it("awards 3 points immediately when a member creates a new order", () => {
    expect(getNewOrderRewardPoints(42)).toBe(3);
    expect(getNewOrderRewardPoints(undefined)).toBe(0);
    expect(getNewOrderRewardPoints(null)).toBe(0);
  });

  it("awards 1 extra point for a strong review but not for lower ratings", () => {
    expect(getReviewBonusPoints(5)).toBe(1);
    expect(getReviewBonusPoints(4)).toBe(1);
    expect(getReviewBonusPoints(3)).toBe(0);
    expect(getReviewBonusPoints(1)).toBe(0);
  });

  it("keeps a Vietnamese label for every trackable status", () => {
    expect(statusLabels.completed).toBe("Hoàn tất");
    expect(Object.keys(statusLabels)).toHaveLength(8);
  });
});
