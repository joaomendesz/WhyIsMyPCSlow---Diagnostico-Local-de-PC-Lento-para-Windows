import { describe, expect, it } from "vitest";
import { buildDiagnosticTimeline } from "./timeline";
import { createSample } from "./testUtils";

describe("buildDiagnosticTimeline", () => {
  it("builds chart-ready samples with offsets and top contributors", () => {
    const firstSample = createSample({
      timestamp: 1_000,
      cpu: 42.25,
      memoryUsed: 67.75,
      diskActivePercent: 66.62,
      diskReadBytesPerSecond: 12.4 * 1024 ** 2,
      diskWriteBytesPerSecond: 3.2 * 1024 ** 2,
      diskQueueLength: 1.66,
      processGroups: [
        createProcessGroup("browser.exe", "Browser", 8, 2 * 1024 ** 3, 2 * 1024 ** 2),
        createProcessGroup("build.exe", "Build Tool", 28.15, 900 * 1024 ** 2, 18 * 1024 ** 2),
      ],
    });
    const secondSample = createSample({
      timestamp: 3_500,
      cpu: 82,
      memoryUsed: 72,
      availableBytes: 1_200 * 1024 ** 2,
      freePercent: 14.24,
      availableStorageBytes: 36 * 1024 ** 3,
      diskActivePercent: 91,
      diskReadBytesPerSecond: 30 * 1024 ** 2,
      diskWriteBytesPerSecond: 11 * 1024 ** 2,
      diskQueueLength: 3,
      processGroups: [
        createProcessGroup("browser.exe", "Browser", 14, 3 * 1024 ** 3, 24 * 1024 ** 2),
        createProcessGroup("sync.exe", "Sync Client", 4, 600 * 1024 ** 2, 6 * 1024 ** 2),
      ],
    });

    const timeline = buildDiagnosticTimeline([firstSample, secondSample]);

    expect(timeline).toHaveLength(2);
    expect(timeline[0]).toMatchObject({
      offsetSeconds: 0,
      cpuUsagePercent: 42.3,
      memoryUsedPercent: 67.8,
      diskActivePercent: 66.6,
      diskQueueLength: 1.7,
      topCpuProcessName: "Build Tool",
      topCpuProcessPercent: 28.2,
      topMemoryProcessName: "Browser",
      topMemoryProcessBytes: 2 * 1024 ** 3,
      topDiskProcessName: "Build Tool",
      topDiskProcessBytesPerSecond: 18 * 1024 ** 2,
    });
    expect(timeline[1]).toMatchObject({
      offsetSeconds: 2.5,
      systemDriveFreePercent: 14.2,
      systemDriveAvailableBytes: 36 * 1024 ** 3,
      topCpuProcessName: "Browser",
      topMemoryProcessName: "Browser",
      topDiskProcessName: "Browser",
    });
  });
});

function createProcessGroup(
  key: string,
  displayName: string,
  totalCpuPercent: number,
  totalMemoryBytes: number,
  totalDiskBytesPerSecond: number,
) {
  return {
    key,
    displayName,
    processCount: 1,
    totalCpuPercent,
    totalMemoryBytes,
    totalDiskReadBytesPerSecond: totalDiskBytesPerSecond * 0.75,
    totalDiskWriteBytesPerSecond: totalDiskBytesPerSecond * 0.25,
    totalDiskBytesPerSecond,
    processes: [],
  };
}
