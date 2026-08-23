import type { MetricsSnapshot, ProcessGroup, StorageVolume } from "../types";
import { DiagnosticThresholds } from "./thresholds";

export interface NumericAggregate {
  average: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  sampleCount: number;
}

export interface ProcessAggregate {
  key: string;
  displayName: string;
  averageCpuPercent: number;
  maxCpuPercent: number;
  averageMemoryBytes: number;
  maxMemoryBytes: number;
  averageDiskReadBytesPerSecond: number;
  averageDiskWriteBytesPerSecond: number;
  averageDiskBytesPerSecond: number;
  maxDiskBytesPerSecond: number;
  sampleRatioPresent: number;
}

export interface DiagnosticAggregates {
  sampleCount: number;
  durationSeconds: number;
  cpuUsage: NumericAggregate;
  memoryUsedPercent: NumericAggregate;
  memoryAvailableBytes: NumericAggregate;
  diskActivePercent: NumericAggregate;
  diskReadBytesPerSecond: NumericAggregate;
  diskWriteBytesPerSecond: NumericAggregate;
  diskTotalBytesPerSecond: NumericAggregate;
  diskQueueLength: NumericAggregate;
  diskIops: NumericAggregate;
  cpuHighSampleRatio: number;
  memoryHighSampleRatio: number;
  memoryLowAvailableSampleRatio: number;
  diskActiveHighSampleRatio: number;
  diskThroughputHighSampleRatio: number;
  diskQueueHighSampleRatio: number;
  processAggregates: ProcessAggregate[];
  latestStorageVolumes: StorageVolume[];
}

interface ProcessAccumulator {
  key: string;
  displayName: string;
  cpuValues: number[];
  memoryValues: number[];
  diskReadValues: number[];
  diskWriteValues: number[];
  diskTotalValues: number[];
  presentSamples: number;
}

export function buildDiagnosticAggregates(samples: MetricsSnapshot[]): DiagnosticAggregates {
  const sampleCount = samples.length;
  const durationSeconds = getDurationSeconds(samples);
  const processAccumulators = new Map<string, ProcessAccumulator>();

  for (const sample of samples) {
    for (const group of sample.processGroups) {
      const accumulator = processAccumulators.get(group.key) ?? createProcessAccumulator(group);
      accumulator.cpuValues.push(group.totalCpuPercent);
      accumulator.memoryValues.push(group.totalMemoryBytes);
      accumulator.diskReadValues.push(group.totalDiskReadBytesPerSecond);
      accumulator.diskWriteValues.push(group.totalDiskWriteBytesPerSecond);
      accumulator.diskTotalValues.push(group.totalDiskBytesPerSecond);
      accumulator.presentSamples += 1;
      processAccumulators.set(group.key, accumulator);
    }
  }

  return {
    sampleCount,
    durationSeconds,
    cpuUsage: aggregateNumbers(samples.map((sample) => sample.cpu.totalUsagePercent)),
    memoryUsedPercent: aggregateNumbers(samples.map((sample) => sample.memory.usedPercent)),
    memoryAvailableBytes: aggregateNumbers(samples.map((sample) => sample.memory.availableBytes)),
    diskActivePercent: aggregateNumbers(
      samples.map((sample) => sample.diskActivity.activePercent ?? Number.NaN),
    ),
    diskReadBytesPerSecond: aggregateNumbers(
      samples.map((sample) => sample.diskActivity.readBytesPerSecond),
    ),
    diskWriteBytesPerSecond: aggregateNumbers(
      samples.map((sample) => sample.diskActivity.writeBytesPerSecond),
    ),
    diskTotalBytesPerSecond: aggregateNumbers(
      samples.map((sample) => sample.diskActivity.totalBytesPerSecond),
    ),
    diskQueueLength: aggregateNumbers(
      samples.map((sample) => sample.diskActivity.queueLength ?? Number.NaN),
    ),
    diskIops: aggregateNumbers(samples.map((sample) => sample.diskActivity.iops ?? Number.NaN)),
    cpuHighSampleRatio: ratioWhere(
      samples.map((sample) => sample.cpu.totalUsagePercent),
      (value) => value >= DiagnosticThresholds.cpu.sustainedHighPercent,
    ),
    memoryHighSampleRatio: ratioWhere(
      samples.map((sample) => sample.memory.usedPercent),
      (value) => value >= DiagnosticThresholds.memory.sustainedHighPercent,
    ),
    memoryLowAvailableSampleRatio: ratioWhere(
      samples.map((sample) => sample.memory.availableBytes),
      (value) => value <= DiagnosticThresholds.memory.lowAvailableBytes,
    ),
    diskActiveHighSampleRatio: ratioWhere(
      samples.map((sample) => sample.diskActivity.activePercent ?? Number.NaN),
      (value) => value >= DiagnosticThresholds.disk.activeHighPercent,
    ),
    diskThroughputHighSampleRatio: ratioWhere(
      samples.map((sample) => sample.diskActivity.totalBytesPerSecond),
      (value) => value >= DiagnosticThresholds.disk.throughputHighBytesPerSecond,
    ),
    diskQueueHighSampleRatio: ratioWhere(
      samples.map((sample) => sample.diskActivity.queueLength ?? Number.NaN),
      (value) => value >= DiagnosticThresholds.disk.queueHighLength,
    ),
    processAggregates: [...processAccumulators.values()]
      .map((accumulator) => ({
        key: accumulator.key,
        displayName: accumulator.displayName,
        averageCpuPercent: aggregateNumbers(accumulator.cpuValues).average,
        maxCpuPercent: aggregateNumbers(accumulator.cpuValues).max,
        averageMemoryBytes: aggregateNumbers(accumulator.memoryValues).average,
        maxMemoryBytes: aggregateNumbers(accumulator.memoryValues).max,
        averageDiskReadBytesPerSecond: aggregateNumbers(accumulator.diskReadValues).average,
        averageDiskWriteBytesPerSecond: aggregateNumbers(accumulator.diskWriteValues).average,
        averageDiskBytesPerSecond: aggregateNumbers(accumulator.diskTotalValues).average,
        maxDiskBytesPerSecond: aggregateNumbers(accumulator.diskTotalValues).max,
        sampleRatioPresent: sampleCount === 0 ? 0 : accumulator.presentSamples / sampleCount,
      }))
      .sort(
        (a, b) =>
          b.averageMemoryBytes - a.averageMemoryBytes ||
          b.averageDiskBytesPerSecond - a.averageDiskBytesPerSecond ||
          b.averageCpuPercent - a.averageCpuPercent,
      ),
    latestStorageVolumes: samples.at(-1)?.storageVolumes ?? [],
  };
}

export function aggregateNumbers(values: number[]): NumericAggregate {
  const safeValues = values.filter(Number.isFinite).sort((a, b) => a - b);
  const sampleCount = safeValues.length;

  if (sampleCount === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      sampleCount: 0,
    };
  }

  const sum = safeValues.reduce((total, value) => total + value, 0);

  return {
    average: sum / sampleCount,
    min: safeValues[0] ?? 0,
    max: safeValues.at(-1) ?? 0,
    p50: percentile(safeValues, 0.5),
    p90: percentile(safeValues, 0.9),
    p95: percentile(safeValues, 0.95),
    sampleCount,
  };
}

export function ratioWhere(values: number[], predicate: (value: number) => boolean): number {
  const safeValues = values.filter(Number.isFinite);

  if (safeValues.length === 0) {
    return 0;
  }

  return safeValues.filter(predicate).length / safeValues.length;
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.ceil(sortedValues.length * percentileValue) - 1;
  return sortedValues[Math.min(sortedValues.length - 1, Math.max(0, index))] ?? 0;
}

function getDurationSeconds(samples: MetricsSnapshot[]): number {
  if (samples.length < 2) {
    return samples.length;
  }

  const first = samples[0]?.timestamp ?? 0;
  const last = samples.at(-1)?.timestamp ?? first;
  return Math.max(1, Math.round((last - first) / 1_000));
}

function createProcessAccumulator(group: ProcessGroup): ProcessAccumulator {
  return {
    key: group.key,
    displayName: group.displayName,
    cpuValues: [],
    memoryValues: [],
    diskReadValues: [],
    diskWriteValues: [],
    diskTotalValues: [],
    presentSamples: 0,
  };
}
