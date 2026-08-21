import { describe, expect, it } from "vitest";
import { resolveRuntimeEnv } from "./env";

describe("resolveRuntimeEnv", () => {
  it("uses the project config as a local fallback when env vars are missing", () => {
    const cfg = resolveRuntimeEnv();

    expect(cfg.oAuthServerUrl).toBe("https://api.manus.im");
    expect(cfg.appId).toBe("kTSGCfNRa8jTpXEfKf2eHv");
    expect(cfg.ownerOpenId).toBe("MRbhtCQ4S8NRxUniZ283id");
  });
});
