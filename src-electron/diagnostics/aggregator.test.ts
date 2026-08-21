import { describe, expect, it } from "vitest";
import { aggregateNumbers, buildDiagnosticAggregates } from "./aggregator";
import { createSample } from "./testUtils";

describe("aggregateNumbers", () => {
  it("calculates percentile and averages", () => {
    const aggregate = aggregateNumbers([10, 30, 20, 90]);

    expect(aggregate.average).toBe(37.5);
    expect(aggregate.min).toBe(10);
    expect(aggregate.max).toBe(90);
    expect(aggregate.p50).toBe(20);
    expect(aggregate.p90).toBe(90);
  });
});

describe("buildDiagnosticAggregates", () => {
  it("tracks sustained CPU and memory pressure ratios", () => {
    const samples = [
      createSample({ cpu: 92, memoryUsed: 94, availableBytes: 300 * 1024 ** 2 }),
      createSample({ cpu: 88, memoryUsed: 93, availableBytes: 400 * 1024 ** 2 }),
      createSample({ cpu: 40, memoryUsed: 70, availableBytes: 4 * 1024 ** 3 }),
    ];

    const aggregates = buildDiagnosticAggregates(samples);

    expect(aggregates.cpuHighSampleRatio).toBeCloseTo(2 / 3);
    expect(aggregates.memoryHighSampleRatio).toBeCloseTo(2 / 3);
    expect(aggregates.memoryLowAvailableSampleRatio).toBeCloseTo(2 / 3);
  });
});
