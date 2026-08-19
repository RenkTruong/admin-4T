export const ORDER_STATUSES = [
  "requested",
  "confirmed",
  "pickup",
  "washing",
  "drying",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusLabels: Record<OrderStatus, string> = {
  requested: "Đã tiếp nhận",
  confirmed: "Đã xác nhận",
  pickup: "Đang lấy đồ",
  washing: "Đang giặt",
  drying: "Đang sấy",
  ready: "Sẵn sàng giao trả",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export function calculateEstimatedTotal(estimatedKg: number, serviceTier: "standard" | "express") {
  const unitPrice = serviceTier === "express" ? 30000 : 15000;
  return Math.max(3, estimatedKg) * unitPrice;
}

export function calculateOrderPoints(totalVnd: number) {
  return Math.floor(totalVnd / 10000);
}
