import { describe, expect, it } from "vitest";
import { addPricingTableRow, canManageServicePricing, createPricingTableDraftRow, parsePricingTableRows, updatePricingTableRow } from "./servicePricing";

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
        updatedAt: null,
      },
    ]);
  });

  it("keeps a newly added row as a draft until it is explicitly saved", () => {
    const initial = [{
      id: "1",
      group: "Giặt Sấy Theo Kg",
      name: "Giặt sấy nhanh",
      unit: "Kg",
      price: 15000,
      note: "",
      updatedAt: "2024-01-01T00:00:00.000Z",
    }];

    const draft = createPricingTableDraftRow(initial, {
      group: "Khác",
      name: "Giặt khô áo sơ mi",
      unit: "Lần",
      price: 20000,
      note: "Mỗi lần",
    });

    expect(draft.id).toBe("2");
    expect(draft.name).toBe("Giặt khô áo sơ mi");
    expect(initial).toHaveLength(1);

    const appended = addPricingTableRow(initial, {
      group: "Khác",
      name: "Giặt khô áo sơ mi",
      unit: "Lần",
      price: 20000,
      note: "Mỗi lần",
    });

    expect(appended).toHaveLength(2);
    expect(appended[1].name).toBe("Giặt khô áo sơ mi");
    expect(appended[1].unit).toBe("Lần");

    const updated = updatePricingTableRow(appended, "2", {
      name: "Giặt khô áo sơ mi premium",
      price: 25000,
      note: "Cập nhật quy cách mới",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    expect(updated[1].name).toBe("Giặt khô áo sơ mi premium");
    expect(updated[1].price).toBe(25000);
    expect(updated[1].updatedAt).toBe("2024-01-02T00:00:00.000Z");
  });
});
