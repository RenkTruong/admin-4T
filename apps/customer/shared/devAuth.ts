export type DevAdminUser = {
  id: number;
  openId: string;
  name: string;
  email: string | null;
  loginMethod: string | null;
  role: "admin";
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

const DEV_ADMIN_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalDevAdminAllowed(hostname?: string) {
  const currentHostname = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "localhost");

  if (!DEV_ADMIN_HOSTNAMES.has(currentHostname)) {
    return false;
  }

  if (typeof process !== "undefined") {
    return process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined;
  }

  return true;
}

export function getLocalDevAdminUser(): DevAdminUser | null {
  if (!isLocalDevAdminAllowed()) {
    return null;
  }

  const now = new Date();

  return {
    id: 1,
    openId: "local-dev-admin",
    name: "Local Admin",
    email: "admin@local.test",
    loginMethod: "local-dev",
    role: "admin",
    permissions: ["manage_service_pricing"],
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}
