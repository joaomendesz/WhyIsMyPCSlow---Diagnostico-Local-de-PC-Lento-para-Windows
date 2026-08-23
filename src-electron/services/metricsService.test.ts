import { describe, expect, it } from "vitest";
import { processMemoryToBytes } from "./metricsService";

describe("processMemoryToBytes", () => {
  it("converts systeminformation process memory from KiB to bytes", () => {
    expect(processMemoryToBytes(1_048_576, "kib")).toBe(1024 ** 3);
  });

  it("keeps PowerShell fallback process memory as bytes", () => {
    expect(processMemoryToBytes(1024 ** 3, "bytes")).toBe(1024 ** 3);
  });
});
