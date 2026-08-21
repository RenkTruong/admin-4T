import { getServiceTierPrice, readServicePricing, type ServiceTier } from "../shared/servicePricing";

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

export function getServicePricingSnapshot() {
  return readServicePricing();
}

export function calculateEstimatedTotal(estimatedKg: number, serviceTier: ServiceTier) {
  return getServiceTierPrice(serviceTier, estimatedKg);
}

export function calculateOrderPoints(totalVnd: number) {
  return Math.floor(totalVnd / 10000);
}
