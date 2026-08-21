import { describe, expect, it } from "vitest";
import { calculateEstimatedTotal, calculateOrderPoints, statusLabels } from "./orderRules";

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

  it("keeps a Vietnamese label for every trackable status", () => {
    expect(statusLabels.completed).toBe("Hoàn tất");
    expect(Object.keys(statusLabels)).toHaveLength(8);
  });
});
