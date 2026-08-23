import type {
  DiagnosticCheck,
  DiagnosticFinding,
  DiagnosticImpact,
  DiagnosticSummary,
  MetricsSnapshot,
  StorageVolume,
} from "../types";
import {
  buildDiagnosticAggregates,
  type DiagnosticAggregates,
  type ProcessAggregate,
} from "./aggregator";
import { DIAGNOSTIC_ENGINE_VERSION, DiagnosticThresholds } from "./thresholds";
import { buildDiagnosticTimeline } from "./timeline";

export function runDiagnosticEngine(samples: MetricsSnapshot[]): DiagnosticSummary {
  const aggregates = buildDiagnosticAggregates(samples);
  const findings = [
    evaluateCpuSaturation(aggregates),
    evaluateCpuHog(aggregates),
    evaluateMemoryPressure(aggregates, samples),
    evaluateMemoryHog(aggregates, samples),
    evaluateLowDiskSpace(aggregates),
  ]
    .filter((finding): finding is DiagnosticFinding => Boolean(finding))
    .sort((a, b) => impactWeight(b.impact) - impactWeight(a.impact) || b.confidence - a.confidence);

  return {
    status:
      aggregates.sampleCount < 3
        ? "inconclusive"
        : findings.length > 0
          ? "issuesFound"
          : "healthy",
    primaryFinding: findings[0] ?? null,
    secondaryFindings: findings.slice(1),
    positiveChecks: buildPositiveChecks(aggregates, findings),
    analyzedAt: new Date().toISOString(),
    sampleCount: aggregates.sampleCount,
    durationSeconds: aggregates.durationSeconds,
    engineVersion: DIAGNOSTIC_ENGINE_VERSION,
    timeline: buildDiagnosticTimeline(samples),
  };
}

function evaluateCpuSaturation(aggregates: DiagnosticAggregates): DiagnosticFinding | null {
  const thresholds = DiagnosticThresholds.cpu;
  const hasSustainedCpu =
    aggregates.cpuHighSampleRatio >= thresholds.requiredHighSampleRatio &&
    aggregates.cpuUsage.p95 >= thresholds.sustainedHighPercent;

  if (!hasSustainedCpu) {
    return null;
  }

  const topCpuProcess = getTopCpuProcess(aggregates);
  const confidence = clampConfidence(
    58 +
      aggregates.cpuHighSampleRatio * 30 +
      (aggregates.cpuUsage.p95 >= thresholds.severePercent ? 8 : 0) +
      (topCpuProcess ? 4 : 0),
  );

  return {
    id: "cpu_saturation",
    category: "cpu",
    title: "CPU permaneceu sob carga alta",
    explanation:
      "A CPU ficou ocupada durante uma parte relevante da analise, o que pode deixar janelas, navegador e apps mais lentos para responder.",
    impact: aggregates.cpuUsage.p95 >= thresholds.severePercent ? "high" : "medium",
    confidence,
    evidence: [
      evidence("Tempo com CPU alta", formatRatio(aggregates.cpuHighSampleRatio), "Percentual da sessao acima do limite configurado."),
      evidence("P95 de CPU", formatPercent(aggregates.cpuUsage.p95), "Pico sustentado observado nas amostras."),
      evidence("Media de CPU", formatPercent(aggregates.cpuUsage.average), "Carga media durante o diagnostico."),
    ],
    recommendations: [
      recommendation("Feche ou pause tarefas pesadas", "Renderizacao, instaladores, atualizacoes e jogos podem monopolizar a CPU."),
      recommendation("Veja o processo contribuinte", "Se um app aparece de forma recorrente no topo, ele deve ser investigado primeiro."),
    ],
    relatedProcesses: topCpuProcess ? [toRelatedProcess(topCpuProcess)] : [],
  };
}

function evaluateCpuHog(aggregates: DiagnosticAggregates): DiagnosticFinding | null {
  const thresholds = DiagnosticThresholds.cpu;
  const topCpuProcess = getTopCpuProcess(aggregates);

  if (
    !topCpuProcess ||
    topCpuProcess.averageCpuPercent < thresholds.hogAveragePercent ||
    topCpuProcess.maxCpuPercent < thresholds.hogPeakPercent ||
    topCpuProcess.sampleRatioPresent < 0.4
  ) {
    return null;
  }

  return {
    id: "cpu_hog",
    category: "process",
    title: `${topCpuProcess.displayName} esta consumindo muita CPU`,
    explanation:
      "Um aplicativo especifico respondeu por uma fatia alta do consumo de CPU durante a analise.",
    impact: topCpuProcess.averageCpuPercent >= 45 ? "high" : "medium",
    confidence: clampConfidence(62 + topCpuProcess.sampleRatioPresent * 20 + topCpuProcess.averageCpuPercent * 0.35),
    evidence: [
      evidence("Processo", topCpuProcess.displayName, "Aplicativo agrupado por nome de processo."),
      evidence("CPU media do app", formatPercent(topCpuProcess.averageCpuPercent), "Media observada quando o processo apareceu."),
      evidence("Pico do app", formatPercent(topCpuProcess.maxCpuPercent), "Maior consumo observado para esse app."),
    ],
    recommendations: [
      recommendation("Verifique a tarefa dentro do aplicativo", "Abas, extensoes, sincronizacao ou uma tarefa em segundo plano podem explicar o consumo."),
      recommendation("Atualize ou reinicie o aplicativo", "Se o uso alto continuar sem motivo claro, reiniciar o app costuma ser o teste mais simples."),
    ],
    relatedProcesses: [toRelatedProcess(topCpuProcess)],
  };
}

function evaluateMemoryPressure(
  aggregates: DiagnosticAggregates,
  samples: MetricsSnapshot[],
): DiagnosticFinding | null {
  const thresholds = DiagnosticThresholds.memory;
  const hasTwoEvidencePoints =
    aggregates.memoryHighSampleRatio >= thresholds.requiredPressureSampleRatio &&
    aggregates.memoryLowAvailableSampleRatio >= thresholds.requiredPressureSampleRatio;

  if (!hasTwoEvidencePoints) {
    return null;
  }

  const topMemoryProcess = getTopMemoryProcess(aggregates);
  const totalMemoryBytes = samples.at(-1)?.memory.totalBytes ?? 0;
  const confidence = clampConfidence(
    60 +
      aggregates.memoryHighSampleRatio * 16 +
      aggregates.memoryLowAvailableSampleRatio * 18 +
      (topMemoryProcess ? 5 : 0),
  );

  return {
    id: "memory_pressure",
    category: "memory",
    title: "Memoria RAM permaneceu sob pressao",
    explanation:
      "A memoria disponivel ficou baixa ao mesmo tempo em que o percentual usado permaneceu alto. Essa combinacao e uma evidencia forte de lentidao por RAM.",
    impact:
      aggregates.memoryAvailableBytes.min <= thresholds.severeAvailableBytes ? "high" : "medium",
    confidence,
    evidence: [
      evidence("RAM usada", formatRatio(aggregates.memoryHighSampleRatio), "Parte da sessao acima do limite de uso configurado."),
      evidence("Memoria disponivel baixa", formatRatio(aggregates.memoryLowAvailableSampleRatio), "Parte da sessao com pouca RAM livre."),
      evidence("Menor memoria disponivel", formatBytes(aggregates.memoryAvailableBytes.min), "Menor valor observado durante a coleta."),
    ],
    recommendations: [
      recommendation("Feche apps que acumulam memoria", "Navegadores, editores, jogos e apps de reuniao costumam ter maior impacto."),
      recommendation("Considere aumentar RAM se for recorrente", `Este PC tem ${formatBytes(totalMemoryBytes)} de RAM fisica detectada.`),
    ],
    relatedProcesses: topMemoryProcess ? [toRelatedProcess(topMemoryProcess)] : [],
  };
}

function evaluateMemoryHog(
  aggregates: DiagnosticAggregates,
  samples: MetricsSnapshot[],
): DiagnosticFinding | null {
  const thresholds = DiagnosticThresholds.memory;
  const topMemoryProcess = getTopMemoryProcess(aggregates);
  const totalMemoryBytes = samples.at(-1)?.memory.totalBytes ?? 0;
  const processMemoryRatio =
    totalMemoryBytes === 0 || !topMemoryProcess
      ? 0
      : topMemoryProcess.averageMemoryBytes / totalMemoryBytes;

  if (
    !topMemoryProcess ||
    topMemoryProcess.averageMemoryBytes < thresholds.hogAbsoluteBytes ||
    processMemoryRatio < thresholds.hogTotalMemoryRatio
  ) {
    return null;
  }

  return {
    id: "memory_hog",
    category: "process",
    title: `${topMemoryProcess.displayName} esta usando muita memoria`,
    explanation:
      "Um aplicativo ficou responsavel por uma parte relevante da RAM usada durante a analise.",
    impact: processMemoryRatio >= 0.4 ? "high" : "medium",
    confidence: clampConfidence(68 + processMemoryRatio * 50),
    evidence: [
      evidence("Processo", topMemoryProcess.displayName, "Aplicativo agrupado por nome de processo."),
      evidence("Memoria media do app", formatBytes(topMemoryProcess.averageMemoryBytes), "Media observada durante a sessao."),
      evidence("Participacao na RAM fisica", formatRatio(processMemoryRatio), "Comparacao com a memoria fisica detectada."),
    ],
    recommendations: [
      recommendation("Reduza a carga desse aplicativo", "Feche abas, projetos, servidores locais ou recursos que nao estejam em uso."),
      recommendation("Observe crescimento ao longo do tempo", "Se a memoria desse app cresce continuamente, pode haver vazamento ou carga excessiva."),
    ],
    relatedProcesses: [toRelatedProcess(topMemoryProcess)],
  };
}

function evaluateLowDiskSpace(aggregates: DiagnosticAggregates): DiagnosticFinding | null {
  const volume = getSystemVolume(aggregates.latestStorageVolumes);
  const thresholds = DiagnosticThresholds.storage;

  if (
    !volume ||
    (volume.freePercent > thresholds.lowFreePercent &&
      volume.availableBytes > thresholds.lowAvailableBytes)
  ) {
    return null;
  }

  return {
    id: "low_disk_space",
    category: "storage",
    title: `Pouco espaco disponivel em ${volume.mount}`,
    explanation:
      "O disco do sistema esta com pouco espaco livre. Isso pode prejudicar atualizacoes, cache, memoria virtual e operacoes temporarias do Windows.",
    impact:
      volume.freePercent <= thresholds.severeFreePercent ||
      volume.availableBytes <= thresholds.severeAvailableBytes
        ? "high"
        : "medium",
    confidence: 100,
    evidence: [
      evidence("Unidade", volume.mount, "Volume identificado como disco do sistema."),
      evidence("Espaco livre", formatBytes(volume.availableBytes), "Bytes livres reportados pelo sistema."),
      evidence("Percentual livre", formatPercent(volume.freePercent), "Percentual livre em relacao a capacidade total."),
    ],
    recommendations: [
      recommendation("Libere espaco no disco do sistema", "Remova arquivos temporarios, downloads antigos ou mova arquivos grandes para outra unidade."),
      recommendation("Mantenha uma reserva operacional", "O Windows costuma se comportar melhor com folga para cache, updates e memoria virtual."),
    ],
    relatedProcesses: [],
  };
}

function buildPositiveChecks(
  aggregates: DiagnosticAggregates,
  findings: DiagnosticFinding[],
): DiagnosticCheck[] {
  const findingIds = new Set(findings.map((finding) => finding.id));
  const checks: DiagnosticCheck[] = [];

  if (!findingIds.has("cpu_saturation")) {
    checks.push({
      id: "cpu_ok",
      title: "CPU sem saturacao sustentada",
      detail: `CPU alta em ${formatRatio(aggregates.cpuHighSampleRatio)} da analise.`,
    });
  }

  if (!findingIds.has("memory_pressure")) {
    checks.push({
      id: "memory_ok",
      title: "Memoria sem pressao forte",
      detail: `Menor memoria disponivel: ${formatBytes(aggregates.memoryAvailableBytes.min)}.`,
    });
  }

  if (!findingIds.has("low_disk_space")) {
    const volume = getSystemVolume(aggregates.latestStorageVolumes);
    checks.push({
      id: "storage_ok",
      title: "Espaco do disco do sistema adequado",
      detail: volume
        ? `${volume.mount} com ${formatBytes(volume.availableBytes)} livres.`
        : "Nenhum volume de sistema foi reportado nesta analise.",
    });
  }

  return checks;
}

function getTopCpuProcess(aggregates: DiagnosticAggregates): ProcessAggregate | null {
  return [...aggregates.processAggregates].sort(
    (a, b) => b.averageCpuPercent - a.averageCpuPercent || b.maxCpuPercent - a.maxCpuPercent,
  )[0] ?? null;
}

function getTopMemoryProcess(aggregates: DiagnosticAggregates): ProcessAggregate | null {
  return aggregates.processAggregates[0] ?? null;
}

function getSystemVolume(volumes: StorageVolume[]): StorageVolume | null {
  return volumes.find((volume) => volume.isSystemDrive) ?? volumes[0] ?? null;
}

function toRelatedProcess(process: ProcessAggregate) {
  return {
    name: process.displayName,
    cpuPercent: process.averageCpuPercent,
    memoryBytes: process.averageMemoryBytes,
  };
}

function evidence(label: string, value: string, detail: string) {
  return { label, value, detail };
}

function recommendation(title: string, detail: string) {
  return { title, detail };
}

function impactWeight(impact: DiagnosticImpact): number {
  return { low: 1, medium: 2, high: 3 }[impact];
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatRatio(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let scaled = value;
  let unitIndex = 0;

  while (Math.abs(scaled) >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }

  const precision = scaled >= 10 || unitIndex === 0 ? 1 : 2;
  return `${scaled.toFixed(precision)} ${units[unitIndex]}`;
}
