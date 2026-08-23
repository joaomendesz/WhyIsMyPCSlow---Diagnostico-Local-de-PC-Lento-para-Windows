import type {
  DiagnosticFinding,
  DiagnosticHistoryDetail,
  DiagnosticReportFormat,
  DiagnosticSummary,
  DiagnosticTimelineSample,
} from "../types";

interface ReportMetric {
  label: string;
  value: string;
}

export interface BuiltDiagnosticReport {
  content: string;
  extension: "html" | "md";
  fileName: string;
  mimeType: string;
}

const REPORT_TITLE = "WhyIsMyPCSlow - Relatorio de Diagnostico";
const MAX_TIMELINE_ROWS = 12;

const statusLabels: Record<DiagnosticSummary["status"], string> = {
  healthy: "Saudavel",
  issuesFound: "Problemas encontrados",
  inconclusive: "Inconclusivo",
};

const impactLabels: Record<DiagnosticFinding["impact"], string> = {
  low: "Baixo",
  medium: "Medio",
  high: "Alto",
};

const categoryLabels: Record<DiagnosticFinding["category"], string> = {
  cpu: "CPU",
  memory: "Memoria RAM",
  storage: "Armazenamento",
  disk: "Disco/I/O",
  process: "Processos",
};

export function buildDiagnosticReport(
  detail: DiagnosticHistoryDetail,
  format: DiagnosticReportFormat,
): BuiltDiagnosticReport {
  const extension = format === "html" ? "html" : "md";

  return {
    content: format === "html" ? buildHtmlReport(detail) : buildMarkdownReport(detail),
    extension,
    fileName: createDiagnosticReportFileName(detail, extension),
    mimeType: format === "html" ? "text/html" : "text/markdown",
  };
}

export function createDiagnosticReportFileName(
  detail: DiagnosticHistoryDetail,
  extension: "html" | "md",
): string {
  const analyzedAt = detail.analyzedAt || detail.summary.analyzedAt;
  const dateSegment = analyzedAt.slice(0, 19).replace(/[:T]/g, "-") || "diagnostico";
  const idSegment = detail.id.replace(/[^a-z0-9-]/gi, "").slice(0, 8) || "local";

  return `WhyIsMyPCSlow-${dateSegment}-${idSegment}.${extension}`;
}

function buildMarkdownReport(detail: DiagnosticHistoryDetail): string {
  const { summary } = detail;
  const lines: string[] = [
    `# ${REPORT_TITLE}`,
    "",
    "Relatorio local para diagnostico de PC lento no Windows. Nenhum dado precisa sair do computador para este arquivo ser gerado.",
    "",
    "## Resumo",
    "",
    `- Status: ${statusLabels[summary.status]}`,
    `- Data da analise: ${summary.analyzedAt}`,
    `- Duracao: ${summary.durationSeconds}s`,
    `- Amostras coletadas: ${summary.sampleCount}`,
    `- Motor: ${summary.engineVersion}`,
    `- Achado principal: ${summary.primaryFinding?.title ?? "Nenhum gargalo principal"}`,
    "",
  ];

  if (summary.primaryFinding) {
    lines.push(...buildMarkdownFindingSection("Achado principal", summary.primaryFinding));
  } else {
    lines.push("## Achado principal", "", "Nenhum gargalo principal foi detectado nesta sessao.", "");
  }

  lines.push(...buildMarkdownSecondaryFindings(summary));
  lines.push(...buildMarkdownPositiveChecks(summary));
  lines.push(...buildMarkdownTimeline(summary.timeline));
  lines.push(
    "## Privacidade",
    "",
    "Este relatorio e gerado a partir do historico SQLite local do WhyIsMyPCSlow. Ele nao contem navegador, documentos pessoais, senhas ou historico de arquivos.",
    "",
  );

  return `${lines.join("\n").trimEnd()}\n`;
}

function buildMarkdownFindingSection(title: string, finding: DiagnosticFinding): string[] {
  const lines = [
    `## ${title}`,
    "",
    `### ${finding.title}`,
    "",
    finding.explanation,
    "",
    "| Campo | Valor |",
    "| --- | --- |",
    `| Categoria | ${escapeMarkdownCell(categoryLabels[finding.category])} |`,
    `| Impacto | ${escapeMarkdownCell(impactLabels[finding.impact])} |`,
    `| Confianca | ${escapeMarkdownCell(formatPercent(finding.confidence))} |`,
    "",
  ];

  if (finding.evidence.length > 0) {
    lines.push(
      "#### Evidencias",
      "",
      "| Evidencia | Valor | Detalhe |",
      "| --- | --- | --- |",
      ...finding.evidence.map(
        (evidence) =>
          `| ${escapeMarkdownCell(evidence.label)} | ${escapeMarkdownCell(evidence.value)} | ${escapeMarkdownCell(evidence.detail)} |`,
      ),
      "",
    );
  }

  if (finding.relatedProcesses.length > 0) {
    lines.push(
      "#### Processos relacionados",
      "",
      "| Processo | CPU | Memoria | Disco |",
      "| --- | --- | --- | --- |",
      ...finding.relatedProcesses.map(
        (process) =>
          `| ${escapeMarkdownCell(process.name)} | ${formatPercent(process.cpuPercent)} | ${formatBytes(process.memoryBytes)} | ${formatBytesPerSecond(process.diskTotalBytesPerSecond)} |`,
      ),
      "",
    );
  }

  if (finding.recommendations.length > 0) {
    lines.push("#### Recomendacoes", "");
    finding.recommendations.forEach((recommendation, index) => {
      lines.push(`${index + 1}. ${recommendation.title}: ${recommendation.detail}`);
    });
    lines.push("");
  }

  return lines;
}

function buildMarkdownSecondaryFindings(summary: DiagnosticSummary): string[] {
  if (summary.secondaryFindings.length === 0) {
    return ["## Achados secundarios", "", "Nenhum achado secundario foi registrado.", ""];
  }

  return [
    "## Achados secundarios",
    "",
    ...summary.secondaryFindings.flatMap((finding) =>
      buildMarkdownFindingSection(finding.title, finding).slice(2),
    ),
  ];
}

function buildMarkdownPositiveChecks(summary: DiagnosticSummary): string[] {
  if (summary.positiveChecks.length === 0) {
    return ["## Checagens saudaveis", "", "Nenhuma checagem positiva foi registrada.", ""];
  }

  return [
    "## Checagens saudaveis",
    "",
    "| Checagem | Detalhe |",
    "| --- | --- |",
    ...summary.positiveChecks.map(
      (check) => `| ${escapeMarkdownCell(check.title)} | ${escapeMarkdownCell(check.detail)} |`,
    ),
    "",
  ];
}

function buildMarkdownTimeline(timeline: DiagnosticTimelineSample[]): string[] {
  if (timeline.length === 0) {
    return ["## Snapshot da linha do tempo", "", "Nenhuma amostra de timeline foi registrada.", ""];
  }

  const stats = buildTimelineStats(timeline);
  const rows = selectTimelineRows(timeline);

  return [
    "## Snapshot da linha do tempo",
    "",
    "| Indicador | Valor |",
    "| --- | --- |",
    ...stats.map((metric) => `| ${escapeMarkdownCell(metric.label)} | ${escapeMarkdownCell(metric.value)} |`),
    "",
    `Amostras representativas: ${rows.length} de ${timeline.length}.`,
    "",
    "| Tempo | CPU | RAM usada | RAM livre | Disco ativo | I/O disco | Fila | Top CPU | Top RAM | Top disco |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(formatTimelineMarkdownRow),
    "",
  ];
}

function buildHtmlReport(detail: DiagnosticHistoryDetail): string {
  const { summary } = detail;
  const primaryFindingHtml = summary.primaryFinding
    ? buildHtmlFindingSection("Achado principal", summary.primaryFinding)
    : `<section><h2>Achado principal</h2><p>Nenhum gargalo principal foi detectado nesta sessao.</p></section>`;

  return [
    "<!doctype html>",
    '<html lang="pt-BR">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(REPORT_TITLE)}</title>`,
    "<style>",
    "body{margin:0;background:#f6f7f9;color:#17202a;font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.55}",
    "main{max-width:1040px;margin:0 auto;padding:40px 24px}",
    "header,section{background:#fff;border:1px solid #d9e0e7;border-radius:8px;padding:24px;margin-bottom:18px;box-shadow:0 10px 24px rgba(23,32,42,.06)}",
    "h1,h2,h3{margin:0 0 12px}h1{font-size:30px}h2{font-size:20px}h3{font-size:16px}",
    "p{margin:8px 0;color:#3d4854}.muted{color:#66717d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}",
    ".metric{border:1px solid #e3e8ee;border-radius:6px;padding:12px;background:#f8fafc}.metric span{display:block;color:#66717d;font-size:12px}.metric strong{font-size:15px}",
    "table{border-collapse:collapse;width:100%;margin:12px 0 6px;font-size:14px}th,td{border:1px solid #e3e8ee;padding:8px;text-align:left;vertical-align:top}th{background:#f1f5f8}",
    "ol{padding-left:22px}.footer{font-size:13px;color:#66717d}",
    "@media print{body{background:#fff}main{padding:0}header,section{box-shadow:none;break-inside:avoid}}",
    "</style>",
    "</head>",
    "<body>",
    "<main>",
    "<header>",
    `<h1>${escapeHtml(REPORT_TITLE)}</h1>`,
    '<p class="muted">Relatorio local para diagnostico de PC lento no Windows. Nenhum dado precisa sair do computador para este arquivo ser gerado.</p>',
    '<div class="grid">',
    buildHtmlMetric("Status", statusLabels[summary.status]),
    buildHtmlMetric("Data da analise", summary.analyzedAt),
    buildHtmlMetric("Duracao", `${summary.durationSeconds}s`),
    buildHtmlMetric("Amostras", String(summary.sampleCount)),
    buildHtmlMetric("Motor", summary.engineVersion),
    buildHtmlMetric("Achado principal", summary.primaryFinding?.title ?? "Nenhum gargalo principal"),
    "</div>",
    "</header>",
    primaryFindingHtml,
    buildHtmlSecondaryFindings(summary),
    buildHtmlPositiveChecks(summary),
    buildHtmlTimeline(summary.timeline),
    "<section>",
    "<h2>Privacidade</h2>",
    '<p class="footer">Este relatorio e gerado a partir do historico SQLite local do WhyIsMyPCSlow. Ele nao contem navegador, documentos pessoais, senhas ou historico de arquivos.</p>',
    "</section>",
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function buildHtmlFindingSection(title: string, finding: DiagnosticFinding): string {
  const evidenceRows = finding.evidence
    .map(
      (evidence) =>
        `<tr><td>${escapeHtml(evidence.label)}</td><td>${escapeHtml(evidence.value)}</td><td>${escapeHtml(evidence.detail)}</td></tr>`,
    )
    .join("");
  const processRows = finding.relatedProcesses
    .map(
      (process) =>
        `<tr><td>${escapeHtml(process.name)}</td><td>${formatPercent(process.cpuPercent)}</td><td>${formatBytes(process.memoryBytes)}</td><td>${formatBytesPerSecond(process.diskTotalBytesPerSecond)}</td></tr>`,
    )
    .join("");
  const recommendations = finding.recommendations
    .map(
      (recommendation) =>
        `<li><strong>${escapeHtml(recommendation.title)}:</strong> ${escapeHtml(recommendation.detail)}</li>`,
    )
    .join("");

  return [
    "<section>",
    `<h2>${escapeHtml(title)}</h2>`,
    `<h3>${escapeHtml(finding.title)}</h3>`,
    `<p>${escapeHtml(finding.explanation)}</p>`,
    '<div class="grid">',
    buildHtmlMetric("Categoria", categoryLabels[finding.category]),
    buildHtmlMetric("Impacto", impactLabels[finding.impact]),
    buildHtmlMetric("Confianca", formatPercent(finding.confidence)),
    "</div>",
    evidenceRows
      ? `<h3>Evidencias</h3><table><thead><tr><th>Evidencia</th><th>Valor</th><th>Detalhe</th></tr></thead><tbody>${evidenceRows}</tbody></table>`
      : "",
    processRows
      ? `<h3>Processos relacionados</h3><table><thead><tr><th>Processo</th><th>CPU</th><th>Memoria</th><th>Disco</th></tr></thead><tbody>${processRows}</tbody></table>`
      : "",
    recommendations ? `<h3>Recomendacoes</h3><ol>${recommendations}</ol>` : "",
    "</section>",
  ].join("\n");
}

function buildHtmlSecondaryFindings(summary: DiagnosticSummary): string {
  if (summary.secondaryFindings.length === 0) {
    return "<section><h2>Achados secundarios</h2><p>Nenhum achado secundario foi registrado.</p></section>";
  }

  return summary.secondaryFindings
    .map((finding) => buildHtmlFindingSection("Achado secundario", finding))
    .join("\n");
}

function buildHtmlPositiveChecks(summary: DiagnosticSummary): string {
  if (summary.positiveChecks.length === 0) {
    return "<section><h2>Checagens saudaveis</h2><p>Nenhuma checagem positiva foi registrada.</p></section>";
  }

  const rows = summary.positiveChecks
    .map((check) => `<tr><td>${escapeHtml(check.title)}</td><td>${escapeHtml(check.detail)}</td></tr>`)
    .join("");

  return `<section><h2>Checagens saudaveis</h2><table><thead><tr><th>Checagem</th><th>Detalhe</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function buildHtmlTimeline(timeline: DiagnosticTimelineSample[]): string {
  if (timeline.length === 0) {
    return "<section><h2>Snapshot da linha do tempo</h2><p>Nenhuma amostra de timeline foi registrada.</p></section>";
  }

  const stats = buildTimelineStats(timeline).map((metric) => buildHtmlMetric(metric.label, metric.value));
  const rows = selectTimelineRows(timeline).map(formatTimelineHtmlRow).join("");

  return [
    "<section>",
    "<h2>Snapshot da linha do tempo</h2>",
    `<p class="muted">Amostras representativas: ${selectTimelineRows(timeline).length} de ${timeline.length}.</p>`,
    `<div class="grid">${stats.join("")}</div>`,
    "<table>",
    "<thead><tr><th>Tempo</th><th>CPU</th><th>RAM usada</th><th>RAM livre</th><th>Disco ativo</th><th>I/O disco</th><th>Fila</th><th>Top CPU</th><th>Top RAM</th><th>Top disco</th></tr></thead>",
    `<tbody>${rows}</tbody>`,
    "</table>",
    "</section>",
  ].join("\n");
}

function buildHtmlMetric(label: string, value: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function buildTimelineStats(timeline: DiagnosticTimelineSample[]): ReportMetric[] {
  const peakCpu = max(timeline.map((sample) => sample.cpuUsagePercent));
  const averageCpu = average(timeline.map((sample) => sample.cpuUsagePercent));
  const peakMemory = max(timeline.map((sample) => sample.memoryUsedPercent));
  const lowestAvailableMemory = min(timeline.map((sample) => sample.memoryAvailableBytes));
  const peakDiskActive = maxDefined(timeline.map((sample) => sample.diskActivePercent));
  const peakDiskThroughput = max(timeline.map((sample) => sample.diskTotalBytesPerSecond));
  const lowestSystemFree = minDefined(timeline.map((sample) => sample.systemDriveFreePercent));
  const lowestSystemFreeBytes = minDefined(timeline.map((sample) => sample.systemDriveAvailableBytes));
  const topCpu = maxBy(timeline, (sample) => sample.topCpuProcessPercent ?? -1);
  const topMemory = maxBy(timeline, (sample) => sample.topMemoryProcessBytes ?? -1);
  const topDisk = maxBy(timeline, (sample) => sample.topDiskProcessBytesPerSecond ?? -1);

  return [
    { label: "CPU media", value: formatPercent(averageCpu) },
    { label: "Pico de CPU", value: formatPercent(peakCpu) },
    { label: "Pico de RAM usada", value: formatPercent(peakMemory) },
    { label: "Menor RAM livre", value: formatBytes(lowestAvailableMemory) },
    { label: "Pico de disco ativo", value: formatPercent(peakDiskActive) },
    { label: "Pico de I/O do disco", value: formatBytesPerSecond(peakDiskThroughput) },
    {
      label: "Menor espaco livre no sistema",
      value:
        lowestSystemFree === null
          ? "--"
          : `${formatPercent(lowestSystemFree)} (${formatBytes(lowestSystemFreeBytes)})`,
    },
    {
      label: "Maior top CPU",
      value: topCpu?.topCpuProcessName
        ? `${topCpu.topCpuProcessName} (${formatPercent(topCpu.topCpuProcessPercent)})`
        : "--",
    },
    {
      label: "Maior top RAM",
      value: topMemory?.topMemoryProcessName
        ? `${topMemory.topMemoryProcessName} (${formatBytes(topMemory.topMemoryProcessBytes)})`
        : "--",
    },
    {
      label: "Maior top disco",
      value: topDisk?.topDiskProcessName
        ? `${topDisk.topDiskProcessName} (${formatBytesPerSecond(topDisk.topDiskProcessBytesPerSecond)})`
        : "--",
    },
  ];
}

function selectTimelineRows(timeline: DiagnosticTimelineSample[]): DiagnosticTimelineSample[] {
  if (timeline.length <= MAX_TIMELINE_ROWS) {
    return timeline;
  }

  const selectedIndexes = new Set<number>();

  for (let index = 0; index < MAX_TIMELINE_ROWS; index += 1) {
    selectedIndexes.add(Math.round((index * (timeline.length - 1)) / (MAX_TIMELINE_ROWS - 1)));
  }

  return [...selectedIndexes].sort((left, right) => left - right).map((index) => timeline[index]);
}

function formatTimelineMarkdownRow(sample: DiagnosticTimelineSample): string {
  return [
    formatTimelineOffset(sample.offsetSeconds),
    formatPercent(sample.cpuUsagePercent),
    formatPercent(sample.memoryUsedPercent),
    formatBytes(sample.memoryAvailableBytes),
    formatPercent(sample.diskActivePercent),
    formatBytesPerSecond(sample.diskTotalBytesPerSecond),
    formatNumber(sample.diskQueueLength),
    formatProcessPercent(sample.topCpuProcessName, sample.topCpuProcessPercent),
    formatProcessBytes(sample.topMemoryProcessName, sample.topMemoryProcessBytes),
    formatProcessBytesPerSecond(sample.topDiskProcessName, sample.topDiskProcessBytesPerSecond),
  ]
    .map(escapeMarkdownCell)
    .join(" | ")
    .replace(/^/, "| ")
    .concat(" |");
}

function formatTimelineHtmlRow(sample: DiagnosticTimelineSample): string {
  const cells = [
    formatTimelineOffset(sample.offsetSeconds),
    formatPercent(sample.cpuUsagePercent),
    formatPercent(sample.memoryUsedPercent),
    formatBytes(sample.memoryAvailableBytes),
    formatPercent(sample.diskActivePercent),
    formatBytesPerSecond(sample.diskTotalBytesPerSecond),
    formatNumber(sample.diskQueueLength),
    formatProcessPercent(sample.topCpuProcessName, sample.topCpuProcessPercent),
    formatProcessBytes(sample.topMemoryProcessName, sample.topMemoryProcessBytes),
    formatProcessBytesPerSecond(sample.topDiskProcessName, sample.topDiskProcessBytesPerSecond),
  ];

  return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
}

function formatProcessPercent(name: string | null, value: number | null): string {
  return name ? `${name} (${formatPercent(value)})` : "--";
}

function formatProcessBytes(name: string | null, value: number | null): string {
  return name ? `${name} (${formatBytes(value)})` : "--";
}

function formatProcessBytesPerSecond(name: string | null, value: number | null): string {
  return name ? `${name} (${formatBytesPerSecond(value)})` : "--";
}

function formatTimelineOffset(value: number): string {
  return `${Math.round(value)}s`;
}

function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let scaled = value;

  while (Math.abs(scaled) >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${Math.round(value)} B`;
  }

  const precision = Math.abs(scaled) >= 10 ? 1 : 2;
  return `${scaled.toFixed(precision)} ${units[unitIndex]}`;
}

function formatBytesPerSecond(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return `${formatBytes(value)}/s`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function max(values: number[]): number {
  return Math.max(...values);
}

function min(values: number[]): number {
  return Math.min(...values);
}

function maxDefined(values: Array<number | null>): number | null {
  const definedValues = values.filter((value): value is number => value !== null);
  return definedValues.length > 0 ? max(definedValues) : null;
}

function minDefined(values: Array<number | null>): number | null {
  const definedValues = values.filter((value): value is number => value !== null);
  return definedValues.length > 0 ? min(definedValues) : null;
}

function maxBy<T>(items: T[], getValue: (item: T) => number): T | null {
  return items.reduce<T | null>((best, item) => {
    if (!best) {
      return item;
    }

    return getValue(item) > getValue(best) ? item : best;
  }, null);
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
