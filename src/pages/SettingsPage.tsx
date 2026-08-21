import { ShieldCheck } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header>
        <h2 className="text-2xl font-semibold tracking-normal">Settings</h2>
        <p className="mt-1 text-sm text-ink/60">Privacidade e seguranca do MVP.</p>
      </header>

      <section className="rounded-md border border-line bg-panel p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-canvas text-mint">
            <ShieldCheck aria-hidden size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">100% local por padrao</h3>
            <p className="mt-1 text-sm text-ink/60">
              Esta fase nao envia metricas, processos ou informacoes do sistema para servidores.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
