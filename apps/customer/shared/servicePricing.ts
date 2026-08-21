export type ServiceTier = "standard" | "express";

export type ServiceTierConfig = {
  label: string;
  unitPrice: number;
  minKg: number;
  eta: string;
  detail: string;
};

export type PricingTableRow = {
  id: string;
  group: string;
  name: string;
  unit: string;
  price: number;
  note: string;
  updatedAt: string | null;
};

export type ServicePricing = {
  standard: ServiceTierConfig;
  express: ServiceTierConfig;
  table: PricingTableRow[];
  updatedAt: string | null;
};

export const SERVICE_PRICING_STORAGE_KEY = "4t-service-pricing";

export const DEFAULT_TABLE_ROWS: PricingTableRow[] = [
  { id: "1", group: "Giặt Sấy Theo Kg", name: "Giặt sấy nhanh (dưới 5kg)", unit: "Kg", price: 15000, note: "Giặt rửa nhanh, sấy khô trong 3h", updatedAt: null },
  { id: "2", group: "Giặt Sấy Theo Kg", name: "Giặt sấy tiết kiệm (5-10kg)", unit: "Kg", price: 8000, note: "Giặt rửa từng khúc", updatedAt: null },
  { id: "3", group: "Giặt Sấy Theo Kg", name: "Giặt sấy công nghiệp (>10kg)", unit: "Kg", price: 15000, note: "Dành cho khối lượng lớn", updatedAt: null },
  { id: "4", group: "Giặt Hấp / Giặt Khô", name: "Giặt hấp áo vest / áo dài", unit: "Bộ/Chiếc", price: 12000, note: "Sử dụng hóa chất chuyên dụng", updatedAt: null },
  { id: "5", group: "Giặt Hấp / Giặt Khô", name: "Giặt hấp giày thể thao", unit: "Đôi", price: 6000, note: "Vệ sinh khu mũi", updatedAt: null },
  { id: "6", group: "Giặt Hấp / Giặt Khô", name: "Giặt hấp gấu bông", unit: "Chiếc", price: 4000, note: "Giặt sấy diet khuẩn", updatedAt: null },
  { id: "7", group: "Chăn Ga Gối Nệm", name: "Giặt nệm lò xo / bông ép", unit: "Chiếc", price: 25000, note: "Vệ sinh tai nha hoa các tiêm", updatedAt: null },
  { id: "8", group: "Chăn Ga Gối Nệm", name: "Giặt chăn bông dày", unit: "Chiếc", price: 7000, note: "Sấy kho diet khuẩn", updatedAt: null },
  { id: "9", group: "Chăn Ga Gối Nệm", name: "Giặt rem cửa", unit: "Kg", price: 25000, note: "Tịnh theo kg thực tế", updatedAt: null },
  { id: "#", group: "Dịch Vụ Khác", name: "Tẩy vết bẩn cứng đầu", unit: "Chiếc", price: 3000, note: "Giá thay đổi tùy vết bẩn", updatedAt: null },
];

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
  table: DEFAULT_TABLE_ROWS,
  updatedAt: null,
};

const normalizeHeader = (value: unknown) => String(value ?? "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]/g, "");

const getHeaderValue = (row: Record<string, unknown>, aliases: string[]) => {
  const keys = Object.keys(row);
  const matchedKey = keys.find(key => aliases.includes(normalizeHeader(key)));
  return matchedKey ? row[matchedKey] : "";
};

const parseMoney = (value: unknown) => {
  const asString = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(asString);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function parsePricingTableRows(rows: Array<Record<string, unknown>>): PricingTableRow[] {
  return rows
    .map((row, index) => {
      const id = String(getHeaderValue(row, ["id"]) || index + 1).trim() || String(index + 1);
      const group = String(getHeaderValue(row, ["nhomdichvu", "nhom", "group", "category"]) || "Khác").trim() || "Khác";
      const name = String(getHeaderValue(row, ["tendichvu", "ten", "service", "name"]) || "").trim();
      const unit = String(getHeaderValue(row, ["donvitinh", "donvi", "unit", "unitname"]) || "Kg").trim() || "Kg";
      const price = parseMoney(getHeaderValue(row, ["giadichvu", "gia", "price", "unitprice", "giamiemyet", "gianiemyet", "giatrenhang"]));
      const note = String(getHeaderValue(row, ["ghichu", "note", "description", "mota", "ghichudichvu"]) || "").trim();
      const updatedAtValue = getHeaderValue(row, ["thoigian", "time", "updatedat", "capnhat", "lastupdated", "updatedtime"]);
      const updatedAt = updatedAtValue ? new Date(String(updatedAtValue)).toISOString() : null;

      if (!name && !group) return null;

      return {
        id: String(id),
        group: group || "Khác",
        name: name || "Dịch vụ mới",
        unit: unit || "Kg",
        price: Math.max(0, price),
        note: note || "",
        updatedAt: updatedAt && !Number.isNaN(Date.parse(String(updatedAtValue))) ? updatedAt : null,
      };
    })
    .filter((row): row is PricingTableRow => Boolean(row));
}

export function createPricingTableDraftRow(rows: PricingTableRow[], draft: Partial<PricingTableRow>) {
  const nextId = String((Number(rows.at(-1)?.id ?? 0) || rows.length) + 1);

  return {
    id: String(draft.id ?? nextId),
    group: draft.group || "Khác",
    name: draft.name || "Dịch vụ mới",
    unit: draft.unit || "Lần",
    price: Number(draft.price) || 0,
    note: draft.note || "",
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  } satisfies PricingTableRow;
}

export function addPricingTableRow(rows: PricingTableRow[], draft: Partial<PricingTableRow>) {
  const newRow = createPricingTableDraftRow(rows, draft);
  return [...rows, newRow];
}

export function updatePricingTableRow(rows: PricingTableRow[], rowId: string, patch: Partial<PricingTableRow>) {
  const nextUpdatedAt = patch.updatedAt ?? new Date().toISOString();

  return rows.map(row => row.id !== rowId ? row : {
    ...row,
    group: patch.group ?? row.group,
    name: patch.name ?? row.name,
    unit: patch.unit ?? row.unit,
    price: typeof patch.price === "number" ? patch.price : row.price,
    note: patch.note ?? row.note,
    updatedAt: nextUpdatedAt,
  });
}

export function deriveTierPricesFromTable(rows: PricingTableRow[] = DEFAULT_TABLE_ROWS) {
  const standardPrice = rows.find(row => /giat|giặt/i.test(row.name) && !/nhanh|express|super/i.test(row.name))?.price ?? DEFAULT_SERVICE_PRICING.standard.unitPrice;
  const expressPrice = rows.find(row => /nhanh|express/i.test(row.name) || /nhanh|express/i.test(row.group))?.price ?? DEFAULT_SERVICE_PRICING.express.unitPrice;

  return {
    standard: Math.max(0, standardPrice),
    express: Math.max(0, expressPrice),
  };
}

export function importServicePricingRows(rows: Array<Record<string, unknown>>) {
  const table = parsePricingTableRows(rows);
  const tierPrices = deriveTierPricesFromTable(table);
  const current = readServicePricing();

  return writeServicePricing({
    table,
    updatedAt: new Date().toISOString(),
    standard: {
      ...current.standard,
      unitPrice: tierPrices.standard,
    },
    express: {
      ...current.express,
      unitPrice: tierPrices.express,
    },
  });
}

export function readServicePricing(): ServicePricing {
  if (typeof window === "undefined") return DEFAULT_SERVICE_PRICING;

  try {
    const raw = window.localStorage.getItem(SERVICE_PRICING_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<ServicePricing> : {};
    const table = Array.isArray(parsed.table) ? parsePricingTableRows(parsed.table as Array<Record<string, unknown>>) : DEFAULT_TABLE_ROWS;
    const tierPrices = deriveTierPricesFromTable(table);

    const standard = {
      ...DEFAULT_SERVICE_PRICING.standard,
      ...parsed.standard,
      unitPrice: Number(parsed.standard?.unitPrice ?? tierPrices.standard) || DEFAULT_SERVICE_PRICING.standard.unitPrice,
    };
    const express = {
      ...DEFAULT_SERVICE_PRICING.express,
      ...parsed.express,
      unitPrice: Number(parsed.express?.unitPrice ?? tierPrices.express) || DEFAULT_SERVICE_PRICING.express.unitPrice,
    };

    return {
      standard,
      express,
      table,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return DEFAULT_SERVICE_PRICING;
  }
}

export function writeServicePricing(next: Partial<ServicePricing>): ServicePricing {
  const existing = readServicePricing();
  const nextTable = Array.isArray(next.table)
    ? next.table.map(row => ({
        ...row,
        updatedAt: row.updatedAt ?? existing.updatedAt ?? new Date().toISOString(),
      }))
    : existing.table;
  const tierPrices = deriveTierPricesFromTable(nextTable);
  const latestRowTimestamp = nextTable.reduce((latest, row) => {
    if (!row.updatedAt) return latest;
    return new Date(row.updatedAt).getTime() > latest ? new Date(row.updatedAt).getTime() : latest;
  }, existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0);
  const merged: ServicePricing = {
    standard: {
      ...DEFAULT_SERVICE_PRICING.standard,
      ...existing.standard,
      ...next.standard,
      unitPrice: Number(next.standard?.unitPrice ?? tierPrices.standard) || existing.standard.unitPrice,
    },
    express: {
      ...DEFAULT_SERVICE_PRICING.express,
      ...existing.express,
      ...next.express,
      unitPrice: Number(next.express?.unitPrice ?? tierPrices.express) || existing.express.unitPrice,
    },
    table: nextTable,
    updatedAt: next.updatedAt ?? (latestRowTimestamp ? new Date(latestRowTimestamp).toISOString() : existing.updatedAt ?? new Date().toISOString()),
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

export function canManageServicePricing(user?: { role?: string; permissions?: string | string[] | null } | null) {
  if (!user) return false;
  if (user.role === "admin") return true;

  const permissions = Array.isArray(user.permissions)
    ? user.permissions
    : typeof user.permissions === "string"
      ? user.permissions.split(",").map(permission => permission.trim()).filter(Boolean)
      : [];

  return permissions.includes("manage_service_pricing");
}
