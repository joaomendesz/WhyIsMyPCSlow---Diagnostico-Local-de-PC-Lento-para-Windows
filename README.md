# WhyIsMyPCSlow

**Windows performance diagnostics desktop app / Aplicativo desktop para diagnosticar PC lento no Windows**

WhyIsMyPCSlow is a local-first desktop application for Windows 10 and Windows 11. It monitors CPU, memory, storage and processes, then runs a deterministic diagnostic engine to explain why a PC may feel slow.

WhyIsMyPCSlow e um aplicativo desktop local-first para Windows 10 e Windows 11. Ele monitora CPU, memoria, armazenamento e processos, depois executa um motor de diagnostico deterministico para explicar por que um PC pode estar lento.

Official GitHub repository / Repositorio oficial no GitHub:

[https://github.com/joaomendesz/WhyIsMyPCSlow---Diagnostico-Local-de-PC-Lento-para-Windows](https://github.com/joaomendesz/WhyIsMyPCSlow---Diagnostico-Local-de-PC-Lento-para-Windows)

## SEO Keywords

Windows performance diagnostics, slow PC analyzer, why is my PC slow, Electron desktop app, React TypeScript desktop app, local-first diagnostics, CPU bottleneck detector, memory pressure detector, low disk space detector, Windows disk 100% diagnostic, disk I/O pressure detector, diagnostic timeline chart, process resource monitor, Windows 11 performance tool, Windows 10 performance monitor, offline PC diagnostics, deterministic diagnostic engine, SQLite diagnostic history.

Diagnostico de desempenho Windows, analisador de PC lento, por que meu PC esta lento, aplicativo desktop Electron, React TypeScript desktop, diagnostico local-first, detector de gargalo de CPU, detector de pressao de memoria RAM, detector de pouco espaco em disco, diagnostico de disco 100% Windows, detector de pressao de I/O de disco, grafico de linha do tempo do diagnostico, monitor de processos Windows, ferramenta de desempenho Windows 11, ferramenta de desempenho Windows 10, diagnostico offline de computador lento, motor de diagnostico deterministico, historico SQLite de diagnosticos.

## Product Vision / Visao do Produto

Traditional monitors show raw numbers:

```text
CPU     92%
Memory  91%
Disk     8 GB free
```

WhyIsMyPCSlow turns those numbers into an explanation:

```text
Memory stayed under pressure during most of the analysis.
Google Chrome was the main memory contributor.
Impact: high.
Confidence: 94%.
Evidence: available memory stayed below 1 GB.
```

O objetivo do projeto nao e ser um "cleaner", "booster" ou ferramenta magica de otimizacao. A identidade do produto e:

```text
Observe -> Correlate -> Diagnose -> Explain -> Recommend
Observar -> Correlacionar -> Diagnosticar -> Explicar -> Recomendar
```

## Current Status / Estado Atual

Implemented in this phase:

- Electron desktop shell.
- React + TypeScript + Vite frontend.
- Tailwind CSS UI.
- Secure Electron preload bridge.
- CPU, memory, storage and grouped process collection.
- Live monitor page.
- Deterministic diagnostic session.
- Sample aggregation.
- Diagnostic Engine v1.
- First six diagnostic rules:
  - CPU Saturation
  - CPU Hog
  - Memory Pressure
  - Memory Hog
  - Low Disk Space
  - Disk I/O Pressure
- Human-readable findings, evidence, impact, confidence and recommendations.
- Local SQLite history for completed diagnostics.
- History page with previous sessions, primary findings and evidence details.
- Diagnostic timeline charts for CPU, memory and system drive free space.
- Per-sample diagnostic timeline storage in SQLite.
- Disk activity, read/write throughput and queue length collection.
- Per-process disk I/O rates when Windows performance counters are available.
- Automated tests for formatting, process names, aggregation and diagnostic rules.

Implementado nesta fase:

- Base desktop com Electron.
- Frontend React + TypeScript + Vite.
- UI com Tailwind CSS.
- Ponte segura via Electron preload.
- Coleta de CPU, memoria, armazenamento e processos agrupados.
- Pagina de monitoramento em tempo real.
- Sessao de diagnostico deterministica.
- Agregacao de amostras.
- Diagnostic Engine v1.
- Seis primeiras regras de diagnostico:
  - Saturacao de CPU
  - Processo consumindo CPU
  - Pressao de memoria RAM
  - Processo consumindo muita memoria
  - Pouco espaco em disco
  - Pressao de I/O de disco
- Findings com texto humano, evidencias, impacto, confianca e recomendacoes.
- Historico local em SQLite para diagnosticos concluidos.
- Pagina de historico com sessoes anteriores, findings principais e detalhes de evidencias.
- Graficos de linha do tempo do diagnostico para CPU, memoria e espaco livre do disco do sistema.
- Armazenamento das amostras da linha do tempo no SQLite.
- Coleta de atividade do disco, leitura/escrita por segundo e fila.
- I/O de disco por processo quando os contadores de performance do Windows estao disponiveis.
- Testes automatizados para formatacao, nomes de processos, agregacao e regras.

## Tech Stack / Tecnologias

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Lucide React
- Recharts
- Zod
- systeminformation
- node:sqlite
- Vitest
- ESLint
- electron-builder

## How It Works / Como Funciona

```text
Windows / Node APIs / systeminformation
      |
MetricsService (Electron main process)
      |
DiagnosticManager
      |
Sample Aggregator
      |
Diagnostic Engine v1
      |
Diagnostic Timeline Builder
      |
Findings + Evidence + Recommendations
      |
SQLite HistoryRepository
      |
Secure Electron IPC
      |
Preload bridge
      |
React UI
```

React renders the interface and calls a small API exposed by `window.whyPcSlow`. The renderer does not access Node.js directly, does not execute shell commands and does not contain the critical diagnostic rules.

O React renderiza a interface e chama uma API pequena exposta por `window.whyPcSlow`. O renderer nao acessa Node.js diretamente, nao executa comandos de shell e nao contem as regras criticas de diagnostico.

## Diagnostic Engine / Motor de Diagnostico

WhyIsMyPCSlow does not classify a computer as slow based on a single metric.

The diagnostic engine evaluates:

- Intensity
- Duration
- Frequency
- Available resources
- Process contribution
- Metric correlation
- Confidence
- Evidence quality

O WhyIsMyPCSlow nao conclui que o computador esta lento com base em uma unica metrica.

O motor de diagnostico avalia:

- Intensidade
- Duracao
- Frequencia
- Recursos disponiveis
- Contribuicao de processos
- Correlacao entre metricas
- Confianca
- Qualidade das evidencias

Example:

```text
RAM at 91% is not enough evidence by itself.

RAM at 91%
+ available memory below 1 GB
+ sustained across most samples
+ top process using a large share of memory
= stronger memory pressure evidence
```

## Diagnostic Timeline / Linha do Tempo do Diagnostico

Every completed diagnostic now includes a chart-ready timeline. The app records one point per collected sample with:

- CPU usage percentage.
- Memory usage percentage.
- Available physical memory.
- Disk active percentage.
- Disk read/write throughput.
- Disk queue length when exposed by Windows.
- Free space percentage on the system drive.
- Available bytes on the system drive.
- Top CPU process group at that moment.
- Top memory process group at that moment.
- Top disk I/O process group at that moment.

Cada diagnostico concluido agora inclui uma linha do tempo pronta para graficos. O app registra um ponto por amostra coletada com:

- Percentual de uso de CPU.
- Percentual de uso de memoria.
- Memoria fisica disponivel.
- Percentual de disco ativo.
- Leitura/escrita do disco por segundo.
- Fila do disco quando exposta pelo Windows.
- Percentual livre no disco do sistema.
- Bytes disponiveis no disco do sistema.
- Grupo de processo com maior CPU naquele momento.
- Grupo de processo com maior memoria naquele momento.
- Grupo de processo com maior I/O de disco naquele momento.

This makes the diagnosis easier to trust: users can see if a bottleneck was sustained, temporary or correlated with another resource.

Isso torna o diagnostico mais confiavel: o usuario consegue ver se o gargalo foi sustentado, temporario ou correlacionado com outro recurso.

## Local History / Historico Local

Completed diagnostics are saved automatically in a local SQLite database stored under Electron's `userData` directory. The renderer never receives a generic SQL API. It can only call safe history commands:

- List diagnostic sessions.
- Open one diagnostic detail.
- Clear local history.

Each saved session stores:

- Analysis date.
- Diagnostic status.
- Primary finding title.
- Impact.
- Confidence.
- Sample count.
- Duration.
- Engine version.
- Full diagnostic summary JSON.
- Per-sample timeline rows for future filters, exports and comparisons.

Os diagnosticos concluidos sao salvos automaticamente em um banco SQLite local dentro do diretorio `userData` do Electron. O renderer nunca recebe uma API SQL generica. Ele so pode chamar comandos seguros de historico:

- Listar sessoes de diagnostico.
- Abrir o detalhe de uma sessao.
- Limpar o historico local.

Cada sessao salva armazena:

- Data da analise.
- Status do diagnostico.
- Titulo do finding principal.
- Impacto.
- Confianca.
- Numero de amostras.
- Duracao.
- Versao do motor.
- JSON completo do resumo diagnostico.
- Linhas de timeline por amostra para filtros, exportacoes e comparacoes futuras.

## Diagnostic Rules v1 / Regras de Diagnostico v1

### CPU Saturation

Detects sustained high CPU usage across the diagnostic window. It uses the ratio of high CPU samples and percentile evidence instead of only the latest sample.

Detecta uso alto sustentado de CPU durante a janela de diagnostico. Usa proporcao de amostras altas e percentis, nao apenas a ultima amostra.

### CPU Hog

Detects a process group that contributes a large amount of CPU usage over time.

Detecta um grupo de processos que contribui com uso elevado de CPU ao longo do tempo.

### Memory Pressure

Requires two independent signals whenever possible:

- High memory usage percentage.
- Low available physical memory.

Exige duas evidencias independentes sempre que possivel:

- Percentual alto de memoria usada.
- Baixa memoria fisica disponivel.

### Memory Hog

Detects a process group that uses a significant amount of RAM compared with installed physical memory.

Detecta um grupo de processos usando uma fatia relevante da RAM fisica instalada.

### Low Disk Space

Detects low free space on the system drive. This can affect Windows updates, cache, temporary files and virtual memory behavior.

Detecta pouco espaco livre no disco do sistema. Isso pode afetar updates do Windows, cache, arquivos temporarios e memoria virtual.

### Disk I/O Pressure

Detects sustained disk activity, high read/write throughput or elevated queue length. This helps explain the common "disk 100%" Windows slowdown even when free space is still acceptable.

Detecta atividade sustentada do disco, leitura/escrita elevada ou fila alta. Isso ajuda a explicar a lentidao comum de "disco 100%" no Windows mesmo quando ainda existe espaco livre aceitavel.

## Privacy / Privacidade

WhyIsMyPCSlow is local-first.

The app does not send metrics, process names, hardware data or system data to any server.

O WhyIsMyPCSlow e local-first.

O aplicativo nao envia metricas, nomes de processos, dados de hardware ou dados do sistema para servidores externos.

It does not collect:

- Passwords
- Cookies
- Browser history
- Clipboard content
- Typed text
- Documents
- File contents
- Tokens
- API keys
- Credentials
- Full process command lines

Ele nao coleta:

- Senhas
- Cookies
- Historico de navegador
- Clipboard
- Texto digitado
- Documentos
- Conteudo de arquivos
- Tokens
- API keys
- Credenciais
- Command line completa dos processos

## Security / Seguranca

Electron security configuration:

- `contextIsolation: true`
- `nodeIntegration: false`
- `webSecurity: true`
- Explicit IPC channels only
- No generic shell endpoint
- No generic filesystem endpoint
- No generic SQL endpoint
- No renderer-provided command execution

The preload exposes:

- `window.whyPcSlow.metrics.getSystemInfo`
- `window.whyPcSlow.metrics.getLatestMetrics`
- `window.whyPcSlow.metrics.getProcesses`
- `window.whyPcSlow.metrics.startStream`
- `window.whyPcSlow.metrics.stopStream`
- `window.whyPcSlow.metrics.onSnapshot`
- `window.whyPcSlow.diagnostics.startQuick`
- `window.whyPcSlow.diagnostics.startComplete`
- `window.whyPcSlow.diagnostics.cancel`
- `window.whyPcSlow.diagnostics.onProgress`
- `window.whyPcSlow.diagnostics.onFinished`
- `window.whyPcSlow.history.list`
- `window.whyPcSlow.history.get`
- `window.whyPcSlow.history.clear`

## Metric Sources / Fontes de Metricas

CPU, memory, storage and process data are collected in the Electron main process using `systeminformation`.

If process collection returns no rows on a Windows machine, the app uses a fixed read-only fallback based on `Get-Process`, executed with `execFile`. The renderer never supplies the command. The fallback does not collect command lines.

Process memory reported by `systeminformation` is normalized from KiB to bytes before reaching the renderer. This keeps memory values correctly differentiated as MB, GB or TB in the dashboard, monitor, diagnostics, timeline chart and history.

Disk activity on Windows is collected through fixed read-only PowerShell/CIM performance counters:

- `Win32_PerfFormattedData_PerfDisk_PhysicalDisk`
- `Win32_PerfFormattedData_PerfProc_Process`

The renderer never supplies counter names or commands. These counters provide disk active percentage, read/write bytes per second, queue length and per-process disk rates when available.

CPU, memoria, armazenamento e processos sao coletados no processo principal do Electron usando `systeminformation`.

Se a coleta de processos nao retornar linhas em uma maquina Windows, o app usa um fallback fixo e somente leitura baseado em `Get-Process`, executado com `execFile`. O renderer nunca fornece o comando. O fallback nao coleta command line.

A memoria de processos reportada pelo `systeminformation` e normalizada de KiB para bytes antes de chegar ao renderer. Isso mantem os valores corretamente diferenciados como MB, GB ou TB no dashboard, monitor, diagnostico, grafico de timeline e historico.

A atividade do disco no Windows e coletada por contadores fixos e somente leitura via PowerShell/CIM:

- `Win32_PerfFormattedData_PerfDisk_PhysicalDisk`
- `Win32_PerfFormattedData_PerfProc_Process`

O renderer nunca fornece nomes de contadores ou comandos. Esses contadores entregam percentual de disco ativo, bytes de leitura/escrita por segundo, fila e taxas de disco por processo quando disponiveis.

## Project Structure / Estrutura do Projeto

```text
src/
  components/
    DiagnosticTimelineChart.tsx
  pages/
  services/
  stores/
  types/
  utils/

src-electron/
  database/
    historyRepository.ts
  diagnostics/
    aggregator.ts
    engine.ts
    manager.ts
    thresholds.ts
    timeline.ts
  services/
    metricsService.ts
    processNames.ts
  ipc.ts
  main.ts
  preload.ts
```

## Development / Desenvolvimento

Install dependencies:

```bash
npm install
```

Run the desktop app:

```bash
npm run dev
```

Build frontend and Electron bundles:

```bash
npm run build
```

Create a Windows installer:

```bash
npm run dist
```

Run only the Vite frontend:

```bash
npm run frontend:dev
```

When opened outside Electron, the UI does not fabricate metrics. It displays a backend unavailable state instead.

Quando aberto fora do Electron, a UI nao inventa metricas. Ela mostra que o backend desktop esta indisponivel.

## Testing / Testes

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Current automated coverage:

- Formatting helpers.
- Friendly process name mapping.
- Numeric aggregation.
- Diagnostic rule behavior.
- Memory pressure evidence principle.
- Low disk space rule.
- Disk I/O pressure rule.
- SQLite history repository.
- Diagnostic timeline builder.
- SQLite timeline sample persistence.
- Byte formatting for MB, GB and TB.
- Process memory unit normalization from KiB to bytes.

Cobertura automatizada atual:

- Helpers de formatacao.
- Mapeamento de nomes amigaveis de processos.
- Agregacao numerica.
- Comportamento das regras de diagnostico.
- Principio de evidencias para pressao de memoria.
- Regra de pouco espaco em disco.
- Regra de pressao de I/O de disco.
- Repositorio SQLite de historico.
- Construtor da linha do tempo diagnostica.
- Persistencia das amostras da timeline no SQLite.
- Formatacao de bytes para MB, GB e TB.
- Normalizacao de memoria de processos de KiB para bytes.

## Example Diagnostic Output / Exemplo de Resultado

```text
Memory stayed under pressure.

Impact: High
Confidence: 94%

Evidence:
- Memory usage stayed high for most of the analysis.
- Available memory stayed below 1 GB.
- Google Chrome was the largest memory contributor.

Recommendations:
- Close unused browser tabs or heavy apps.
- If this repeats often, consider adding more RAM.
```

```text
A memoria RAM permaneceu sob pressao.

Impacto: Alto
Confianca: 94%

Evidencias:
- O uso de memoria ficou alto durante a maior parte da analise.
- A memoria disponivel ficou abaixo de 1 GB.
- Google Chrome foi o maior contribuinte de memoria.

Recomendacoes:
- Feche abas ou aplicativos pesados que nao estao em uso.
- Se isso se repetir com frequencia, considere aumentar a RAM.
```

## Limitations / Limitacoes

- Disk activity depends on Windows performance counters being available.
- Per-process disk I/O may be unavailable on restricted Windows environments.
- Startup apps and power plan context are not implemented yet.
- GPU, temperature, SMART and Windows Event Log analysis are intentionally out of scope for this phase.
- The current backend is Electron/Node-based. A future native helper can still be added behind the same preload API.

- Atividade de disco depende dos contadores de performance do Windows estarem disponiveis.
- I/O de disco por processo pode ficar indisponivel em ambientes Windows restritos.
- Apps de inicializacao e plano de energia ainda nao foram implementados.
- GPU, temperatura, SMART e Windows Event Log estao fora do escopo desta fase.
- O backend atual e baseado em Electron/Node. Um helper nativo futuro ainda pode ser adicionado por tras da mesma API do preload.

## Roadmap / Proximas Etapas

Next recommended slices:

1. Add exportable diagnostic reports with timeline snapshots.
2. Add search and filters to local history.
3. Add startup apps and power plan collectors.
4. Improve process grouping with parent process context.
5. Add timeline comparison between diagnostic sessions.
6. Add disk model/type context for HDD vs SSD explanations.
7. Harden IPC payload validation with Zod.
8. Build and test a signed Windows installer.

Proximas fatias recomendadas:

1. Adicionar relatorios exportaveis com capturas da timeline.
2. Adicionar busca e filtros no historico local.
3. Adicionar coletores de inicializacao e plano de energia.
4. Melhorar agrupamento de processos com contexto de processo pai.
5. Adicionar comparacao de timeline entre sessoes de diagnostico.
6. Adicionar contexto de tipo/modelo de disco para explicar HDD vs SSD.
7. Reforcar validacao dos payloads IPC com Zod.
8. Criar e testar um installer Windows assinado.

## Project Identity / Identidade do Projeto

WhyIsMyPCSlow is not a cleaner.

WhyIsMyPCSlow is not a registry booster.

WhyIsMyPCSlow is not a fake FPS optimizer.

It is a serious local diagnostic tool for understanding Windows performance problems.

O WhyIsMyPCSlow nao e cleaner.

O WhyIsMyPCSlow nao e otimizador de registro.

O WhyIsMyPCSlow nao e booster falso de FPS.

E uma ferramenta local e seria para entender problemas de desempenho no Windows.
