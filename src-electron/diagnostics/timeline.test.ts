import { describe, expect, it } from "vitest";
import { buildDiagnosticTimeline } from "./timeline";
import { createSample } from "./testUtils";

describe("buildDiagnosticTimeline", () => {
  it("builds chart-ready samples with offsets and top contributors", () => {
    const firstSample = createSample({
      timestamp: 1_000,
      cpu: 42.25,
      memoryUsed: 67.75,
      processGroups: [
        createProcessGroup("browser.exe", "Browser", 8, 2 * 1024 ** 3),
        createProcessGroup("build.exe", "Build Tool", 28.15, 900 * 1024 ** 2),
      ],
    });
    const secondSample = createSample({
      timestamp: 3_500,
      cpu: 82,
      memoryUsed: 72,
      availableBytes: 1_200 * 1024 ** 2,
      freePercent: 14.24,
      availableStorageBytes: 36 * 1024 ** 3,
      processGroups: [
        createProcessGroup("browser.exe", "Browser", 14, 3 * 1024 ** 3),
        createProcessGroup("sync.exe", "Sync Client", 4, 600 * 1024 ** 2),
      ],
    });

    const timeline = buildDiagnosticTimeline([firstSample, secondSample]);

    expect(timeline).toHaveLength(2);
    expect(timeline[0]).toMatchObject({
      offsetSeconds: 0,
      cpuUsagePercent: 42.3,
      memoryUsedPercent: 67.8,
      topCpuProcessName: "Build Tool",
      topCpuProcessPercent: 28.2,
      topMemoryProcessName: "Browser",
      topMemoryProcessBytes: 2 * 1024 ** 3,
    });
    expect(timeline[1]).toMatchObject({
      offsetSeconds: 2.5,
      systemDriveFreePercent: 14.2,
      systemDriveAvailableBytes: 36 * 1024 ** 3,
      topCpuProcessName: "Browser",
      topMemoryProcessName: "Browser",
    });
  });
});

function createProcessGroup(
  key: string,
  displayName: string,
  totalCpuPercent: number,
  totalMemoryBytes: number,
) {
  return {
    key,
    displayName,
    processCount: 1,
    totalCpuPercent,
    totalMemoryBytes,
    processes: [],
  };
}
