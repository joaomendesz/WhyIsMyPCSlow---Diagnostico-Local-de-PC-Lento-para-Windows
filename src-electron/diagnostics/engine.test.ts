import { describe, expect, it } from "vitest";
import { runDiagnosticEngine } from "./engine";
import { createSample } from "./testUtils";

describe("runDiagnosticEngine", () => {
  it("finds memory pressure only when there are two independent evidence points", () => {
    const summary = runDiagnosticEngine([
      createSample({ memoryUsed: 94, availableBytes: 420 * 1024 ** 2 }),
      createSample({ memoryUsed: 95, availableBytes: 380 * 1024 ** 2 }),
      createSample({ memoryUsed: 93, availableBytes: 450 * 1024 ** 2 }),
    ]);

    expect(summary.status).toBe("issuesFound");
    expect(summary.primaryFinding?.id).toBe("memory_pressure");
  });

  it("does not flag high memory percent when available memory is still healthy", () => {
    const summary = runDiagnosticEngine([
      createSample({ memoryUsed: 91, availableBytes: 4 * 1024 ** 3 }),
      createSample({ memoryUsed: 92, availableBytes: 4 * 1024 ** 3 }),
      createSample({ memoryUsed: 91, availableBytes: 4 * 1024 ** 3 }),
    ]);

    expect(summary.primaryFinding?.id).not.toBe("memory_pressure");
  });

  it("finds low disk space on the system drive", () => {
    const summary = runDiagnosticEngine([
      createSample({ freePercent: 4, availableStorageBytes: 4 * 1024 ** 3 }),
      createSample({ freePercent: 4, availableStorageBytes: 4 * 1024 ** 3 }),
      createSample({ freePercent: 4, availableStorageBytes: 4 * 1024 ** 3 }),
    ]);

    expect(summary.status).toBe("issuesFound");
    expect(summary.primaryFinding?.id).toBe("low_disk_space");
    expect(summary.primaryFinding?.confidence).toBe(100);
  });

  it("finds sustained disk I/O pressure", () => {
    const summary = runDiagnosticEngine([
      createSample({
        diskActivePercent: 96,
        diskReadBytesPerSecond: 38 * 1024 ** 2,
        diskWriteBytesPerSecond: 12 * 1024 ** 2,
        diskQueueLength: 4,
      }),
      createSample({
        diskActivePercent: 91,
        diskReadBytesPerSecond: 30 * 1024 ** 2,
        diskWriteBytesPerSecond: 18 * 1024 ** 2,
        diskQueueLength: 3,
      }),
      createSample({
        diskActivePercent: 88,
        diskReadBytesPerSecond: 26 * 1024 ** 2,
        diskWriteBytesPerSecond: 14 * 1024 ** 2,
        diskQueueLength: 2.5,
      }),
    ]);

    expect(summary.status).toBe("issuesFound");
    expect(summary.primaryFinding?.id).toBe("disk_io_pressure");
    expect(summary.primaryFinding?.category).toBe("disk");
  });
});
