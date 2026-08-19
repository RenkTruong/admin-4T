import { makeRequest, type DirectionsResult } from "./_core/map";
import { calculateEstimatedTotal } from "./orderRules";

export const STORE_ORIGIN_ADDRESS = "123 Liên Khu 4-5, Quận Bình Tân, TP.HCM, Việt Nam";
export const SHIPPING_PRICE_PER_KM_VND = 2_000;
export const FREE_SHIPPING_DISTANCE_METERS = 5_000;
export const FREE_SHIPPING_MIN_KG_EXCLUSIVE = 10;

export type DeliveryMethod = "store" | "address";

export function calculateShippingFeeVnd(deliveryMethod: DeliveryMethod, estimatedKg: number, routeDistanceMeters: number) {
  if (deliveryMethod === "store") return 0;
  if (estimatedKg > FREE_SHIPPING_MIN_KG_EXCLUSIVE && routeDistanceMeters <= FREE_SHIPPING_DISTANCE_METERS) return 0;
  return Math.max(1, Math.ceil(routeDistanceMeters / 1_000)) * SHIPPING_PRICE_PER_KM_VND;
}

export async function getDeliveryQuote(input: { deliveryMethod: DeliveryMethod; pickupAddress: string; estimatedKg: number; serviceTier: "standard" | "express" }) {
  const serviceFeeVnd = calculateEstimatedTotal(input.estimatedKg, input.serviceTier);
  if (input.deliveryMethod === "store") {
    return { storeAddress: STORE_ORIGIN_ADDRESS, routeDistanceMeters: 0, routeDurationSeconds: 0, shippingFeeVnd: 0, serviceFeeVnd, estimatedTotalVnd: serviceFeeVnd, resolvedPickupAddress: null };
  }

  if (input.pickupAddress.trim().length < 8) {
    throw new Error("Vui lòng nhập địa chỉ giao–nhận chi tiết để 4T tính quãng đường.");
  }

  const route = await makeRequest<DirectionsResult>("/maps/api/directions/json", {
    origin: STORE_ORIGIN_ADDRESS,
    destination: input.pickupAddress,
    mode: "driving",
    language: "vi",
    region: "vn",
  });
  const leg = route.routes?.[0]?.legs?.[0];
  if (route.status !== "OK" || !leg?.distance?.value) {
    throw new Error("Không thể xác định tuyến đường. Vui lòng kiểm tra địa chỉ nhận đồ chi tiết hơn.");
  }
  const routeDistanceMeters = leg.distance.value;
  const shippingFeeVnd = calculateShippingFeeVnd(input.deliveryMethod, input.estimatedKg, routeDistanceMeters);
  return {
    storeAddress: STORE_ORIGIN_ADDRESS,
    routeDistanceMeters,
    routeDurationSeconds: leg.duration?.value ?? 0,
    shippingFeeVnd,
    serviceFeeVnd,
    estimatedTotalVnd: serviceFeeVnd + shippingFeeVnd,
    resolvedPickupAddress: leg.end_address || input.pickupAddress,
  };
}
