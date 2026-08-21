import { History } from "lucide-react";

export function HistoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header>
        <h2 className="text-2xl font-semibold tracking-normal">Historico</h2>
        <p className="mt-1 text-sm text-ink/60">SQLite sera ativado na fase de sessoes.</p>
      </header>

      <section className="rounded-md border border-line bg-panel p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-canvas text-amber">
            <History aria-hidden size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sem diagnosticos salvos ainda</h3>
            <p className="mt-1 text-sm text-ink/60">Nenhum dado historico e coletado nesta fase.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
