export type ServiceTier = "standard" | "express";

export type ServiceTierConfig = {
  label: string;
  unitPrice: number;
  minKg: number;
  eta: string;
  detail: string;
};

export type ServicePricing = {
  standard: ServiceTierConfig;
  express: ServiceTierConfig;
};

export const SERVICE_PRICING_STORAGE_KEY = "4t-service-pricing";

export const DEFAULT_SERVICE_PRICING: ServicePricing = {
  standard: {
    label: "Tiêu chuẩn",
    unitPrice: 15000,
    minKg: 3,
    eta: "24 giờ",
    detail: "Tối thiểu 3 kg · dự kiến 24 giờ",
  },
  express: {
    label: "Nhanh",
    unitPrice: 30000,
    minKg: 3,
    eta: "4–8 giờ",
    detail: "Ưu tiên xử lý · 4–8 giờ",
  },
};

export function readServicePricing(): ServicePricing {
  if (typeof window === "undefined") return DEFAULT_SERVICE_PRICING;

  try {
    const raw = window.localStorage.getItem(SERVICE_PRICING_STORAGE_KEY);
    if (!raw) return DEFAULT_SERVICE_PRICING;

    const parsed = JSON.parse(raw) as Partial<ServicePricing>;
    return {
      standard: { ...DEFAULT_SERVICE_PRICING.standard, ...parsed.standard },
      express: { ...DEFAULT_SERVICE_PRICING.express, ...parsed.express },
    };
  } catch {
    return DEFAULT_SERVICE_PRICING;
  }
}

export function writeServicePricing(next: Partial<ServicePricing>): ServicePricing {
  const merged = {
    standard: { ...DEFAULT_SERVICE_PRICING.standard, ...readServicePricing().standard, ...next.standard },
    express: { ...DEFAULT_SERVICE_PRICING.express, ...readServicePricing().express, ...next.express },
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SERVICE_PRICING_STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function formatServicePrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function getServiceTierMeta(serviceTier: ServiceTier): ServiceTierConfig {
  return readServicePricing()[serviceTier];
}

export function getServiceTierPrice(serviceTier: ServiceTier, estimatedKg?: number) {
  const config = getServiceTierMeta(serviceTier);
  const weight = Math.max(config.minKg, Number(estimatedKg) || config.minKg);
  return weight * config.unitPrice;
}

export function canManageServicePricing(user?: { role?: string; permissions?: string[] } | null) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return Array.isArray(user.permissions) && user.permissions.includes("manage_service_pricing");
}
