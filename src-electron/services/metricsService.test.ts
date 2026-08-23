import { describe, expect, it } from "vitest";
import {
  parsePowerShellDiskActivity,
  parsePowerShellProcessDiskRates,
  processMemoryToBytes,
} from "./metricsService";

describe("processMemoryToBytes", () => {
  it("converts systeminformation process memory from KiB to bytes", () => {
    expect(processMemoryToBytes(1_048_576, "kib")).toBe(1024 ** 3);
  });

  it("keeps PowerShell fallback process memory as bytes", () => {
    expect(processMemoryToBytes(1024 ** 3, "bytes")).toBe(1024 ** 3);
  });
});

describe("parsePowerShellDiskActivity", () => {
  it("normalizes Windows disk performance counters", () => {
    const sample = parsePowerShellDiskActivity(
      JSON.stringify({
        activePercent: 135,
        readBytesPerSecond: 12 * 1024 ** 2,
        writeBytesPerSecond: 4 * 1024 ** 2,
        queueLength: 3,
        readsPerSecond: 120,
        writesPerSecond: 40,
      }),
    );

    expect(sample.activePercent).toBe(100);
    expect(sample.readBytesPerSecond).toBe(12 * 1024 ** 2);
    expect(sample.writeBytesPerSecond).toBe(4 * 1024 ** 2);
    expect(sample.totalBytesPerSecond).toBe(16 * 1024 ** 2);
    expect(sample.queueLength).toBe(3);
    expect(sample.iops).toBe(160);
    expect(sample.source).toBe("powershell");
  });
});

describe("parsePowerShellProcessDiskRates", () => {
  it("indexes process disk rates by pid", () => {
    const rates = parsePowerShellProcessDiskRates(
      JSON.stringify([
        {
          pid: 100,
          readBytesPerSecond: 1024,
          writeBytesPerSecond: 2048,
        },
        {
          pid: 0,
          readBytesPerSecond: 999,
          writeBytesPerSecond: 999,
        },
      ]),
    );

    expect(rates.get(100)).toEqual({
      readBytesPerSecond: 1024,
      writeBytesPerSecond: 2048,
    });
    expect(rates.has(0)).toBe(false);
  });
});
