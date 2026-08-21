# WhyIsMyPCSlow

**Windows performance diagnostics desktop app / Aplicativo desktop para diagnosticar PC lento no Windows**

WhyIsMyPCSlow is a local-first desktop application for Windows 10 and Windows 11. It monitors CPU, memory, storage and processes, then runs a deterministic diagnostic engine to explain why a PC may feel slow.

WhyIsMyPCSlow e um aplicativo desktop local-first para Windows 10 e Windows 11. Ele monitora CPU, memoria, armazenamento e processos, depois executa um motor de diagnostico deterministico para explicar por que um PC pode estar lento.

## SEO Keywords

Windows performance diagnostics, slow PC analyzer, why is my PC slow, Electron desktop app, React TypeScript desktop app, local-first diagnostics, CPU bottleneck detector, memory pressure detector, low disk space detector, process resource monitor, Windows 11 performance tool, Windows 10 performance monitor, offline PC diagnostics, deterministic diagnostic engine.

Diagnostico de desempenho Windows, analisador de PC lento, por que meu PC esta lento, aplicativo desktop Electron, React TypeScript desktop, diagnostico local-first, detector de gargalo de CPU, detector de pressao de memoria RAM, detector de pouco espaco em disco, monitor de processos Windows, ferramenta de desempenho Windows 11, ferramenta de desempenho Windows 10, diagnostico offline de computador lento, motor de diagnostico deterministico.

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
- First five diagnostic rules:
  - CPU Saturation
  - CPU Hog
  - Memory Pressure
  - Memory Hog
  - Low Disk Space
- Human-readable findings, evidence, impact, confidence and recommendations.
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
- Cinco primeiras regras de diagnostico:
  - Saturacao de CPU
  - Processo consumindo CPU
  - Pressao de memoria RAM
  - Processo consumindo muita memoria
  - Pouco espaco em disco
- Findings com texto humano, evidencias, impacto, confianca e recomendacoes.
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
Findings + Evidence + Recommendations
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

## Metric Sources / Fontes de Metricas

CPU, memory, storage and process data are collected in the Electron main process using `systeminformation`.

If process collection returns no rows on a Windows machine, the app uses a fixed read-only fallback based on `Get-Process`, executed with `execFile`. The renderer never supplies the command. The fallback does not collect command lines.

CPU, memoria, armazenamento e processos sao coletados no processo principal do Electron usando `systeminformation`.

Se a coleta de processos nao retornar linhas em uma maquina Windows, o app usa um fallback fixo e somente leitura baseado em `Get-Process`, executado com `execFile`. O renderer nunca fornece o comando. O fallback nao coleta command line.

## Project Structure / Estrutura do Projeto

```text
src/
  components/
  pages/
  services/
  stores/
  types/
  utils/

src-electron/
  diagnostics/
    aggregator.ts
    engine.ts
    manager.ts
    thresholds.ts
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

Cobertura automatizada atual:

- Helpers de formatacao.
- Mapeamento de nomes amigaveis de processos.
- Agregacao numerica.
- Comportamento das regras de diagnostico.
- Principio de evidencias para pressao de memoria.
- Regra de pouco espaco em disco.

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

- SQLite history is not implemented yet.
- Disk activity, queue length and process I/O are not implemented yet.
- Startup apps and power plan context are not implemented yet.
- GPU, temperature, SMART and Windows Event Log analysis are intentionally out of scope for this phase.
- The current backend is Electron/Node-based. A future native helper can still be added behind the same preload API.

- Historico em SQLite ainda nao foi implementado.
- Atividade de disco, fila de disco e I/O por processo ainda nao foram implementados.
- Apps de inicializacao e plano de energia ainda nao foram implementados.
- GPU, temperatura, SMART e Windows Event Log estao fora do escopo desta fase.
- O backend atual e baseado em Electron/Node. Um helper nativo futuro ainda pode ser adicionado por tras da mesma API do preload.

## Roadmap / Proximas Etapas

Next recommended slices:

1. Save diagnostic summaries locally with SQLite.
2. Add disk activity and process I/O metrics.
3. Add startup apps and power plan collectors.
4. Improve process grouping with parent process context.
5. Add timeline charts for CPU and memory during diagnostic sessions.
6. Add exportable diagnostic reports.
7. Harden IPC payload validation with Zod.
8. Build and test a signed Windows installer.

Proximas fatias recomendadas:

1. Salvar diagnosticos localmente com SQLite.
2. Adicionar atividade de disco e I/O por processo.
3. Adicionar coletores de inicializacao e plano de energia.
4. Melhorar agrupamento de processos com contexto de processo pai.
5. Adicionar graficos de linha para CPU e memoria durante diagnosticos.
6. Adicionar relatorios exportaveis.
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
