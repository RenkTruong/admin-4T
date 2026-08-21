import { describe, expect, it } from "vitest";
import { canManageServicePricing, parsePricingTableRows } from "./servicePricing";

describe("service pricing permissions", () => {
  it("allows a user when permission is provided as a string or array", () => {
    expect(canManageServicePricing({ role: "staff", permissions: "manage_service_pricing" })).toBe(true);
    expect(canManageServicePricing({ role: "staff", permissions: ["manage_service_pricing"] })).toBe(true);
    expect(canManageServicePricing({ role: "staff", permissions: [] })).toBe(false);
  });
});

describe("service pricing excel template", () => {
  it("reads the exact template headers from the sample excel file", () => {
    const rows = [{
      ID: "1",
      Nhóm_Dịch_Vụ: "Giặt Sấy Theo Kg",
      Tên_Dịch_Vụ: "Giặt sấy nhanh (dưới 5kg)",
      Đơn_Vị_Tính: "Kg",
      Giá: "15000",
      Ghi_Chú: "Giặt rửa nhanh, sấy khô trong 3h",
    }];

    expect(parsePricingTableRows(rows)).toEqual([
      {
        id: "1",
        group: "Giặt Sấy Theo Kg",
        name: "Giặt sấy nhanh (dưới 5kg)",
        unit: "Kg",
        price: 15000,
        note: "Giặt rửa nhanh, sấy khô trong 3h",
      },
    ]);
  });
});
