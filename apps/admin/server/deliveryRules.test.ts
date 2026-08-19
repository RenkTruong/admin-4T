import { describe, expect, it } from "vitest";
import { calculateShippingFeeVnd } from "./deliveryRules";

describe("calculateShippingFeeVnd", () => {
  it("miễn phí cho khách tự nhận tại cửa hàng", () => {
    expect(calculateShippingFeeVnd("store", 3, 0)).toBe(0);
  });

  it("miễn phí khi đơn trên 10 kg và tuyến không quá 5 km", () => {
    expect(calculateShippingFeeVnd("address", 11, 5_000)).toBe(0);
  });

  it("tính 2.000 đồng mỗi km, làm tròn lên, cho trường hợp còn lại", () => {
    expect(calculateShippingFeeVnd("address", 10, 5_000)).toBe(10_000);
    expect(calculateShippingFeeVnd("address", 11, 5_001)).toBe(12_000);
  });
});
