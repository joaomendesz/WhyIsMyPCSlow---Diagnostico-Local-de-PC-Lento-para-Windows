import { describe, expect, it } from "vitest";
import {
  clampPercent,
  formatBytes,
  formatBytesPerSecond,
  formatPercent,
  formatUptime,
} from "./format";

describe("formatBytes", () => {
  it("formats byte values into readable units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10.0 MB");
    expect(formatBytes(2 * 1024 ** 3)).toBe("2.00 GB");
    expect(formatBytes(3 * 1024 ** 4)).toBe("3.00 TB");
  });

  it("handles missing values", () => {
    expect(formatBytes(null)).toBe("--");
  });
});

describe("formatPercent", () => {
  it("rounds percentage values", () => {
    expect(formatPercent(37.6)).toBe("38%");
  });
});

describe("formatBytesPerSecond", () => {
  it("formats byte rates", () => {
    expect(formatBytesPerSecond(5 * 1024 ** 2)).toBe("5.00 MB/s");
    expect(formatBytesPerSecond(null)).toBe("--");
  });
});

describe("formatUptime", () => {
  it("formats longer uptimes by day and hour", () => {
    expect(formatUptime(172_800 + 7_200)).toBe("2d 2h");
  });
});

describe("clampPercent", () => {
  it("keeps values inside the UI range", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(140)).toBe(100);
  });
});
