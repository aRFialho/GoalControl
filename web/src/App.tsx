import { useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "./components/AdminPanel";
import { CollapsibleTab } from "./components/CollapsibleTab";
import { DashboardPanel } from "./components/DashboardPanel";
import { launchExtremeCelebration, launchSaleConfetti } from "./lib/effects";
import { useGoalControlStore } from "./store/useGoalControlStore";

const FESTIVE_ALERT_DURATION_MS = 30_000;

function ConnectionChip({ status }: { status: "connecting" | "online" | "offline" }) {
  const palette =
    status === "online"
      ? "bg-lime text-ink"
      : status === "connecting"
        ? "bg-mango text-ink"
        : "bg-red-200 text-red-700";
  const label =
    status === "online"
      ? "Ao vivo"
      : status === "connecting"
        ? "Conectando"
        : "Offline";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${palette}`}>
      {label}
    </span>
  );
}

export default function App() {
  const snapshot = useGoalControlStore((state) => state.snapshot);
  const lastSaleEvent = useGoalControlStore((state) => state.lastSaleEvent);
  const connectionStatus = useGoalControlStore((state) => state.connectionStatus);
  const errorMessage = useGoalControlStore((state) => state.errorMessage);
  const clearError = useGoalControlStore((state) => state.clearError);
  const init = useGoalControlStore((state) => state.init);

  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [dashCollapsed, setDashCollapsed] = useState(false);
  const [saleFlash, setSaleFlash] = useState(false);
  const [hotSaleFeedback, setHotSaleFeedback] = useState<string | null>(null);
  const [outletCelebration, setOutletCelebration] = useState<string | null>(null);

  const flashTimerRef = useRef<number | null>(null);
  const hotTimerRef = useRef<number | null>(null);
  const outletTimerRef = useRef<number | null>(null);
  const handledEventRef = useRef<number | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!lastSaleEvent || handledEventRef.current === lastSaleEvent.id) {
      return;
    }
    handledEventRef.current = lastSaleEvent.id;

    launchSaleConfetti();
    setSaleFlash(true);
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(
      () => setSaleFlash(false),
      FESTIVE_ALERT_DURATION_MS
    );

    if (lastSaleEvent.hotRelaunch) {
      setHotSaleFeedback(lastSaleEvent.feedbackMessage);
      if (hotTimerRef.current) {
        window.clearTimeout(hotTimerRef.current);
      }
      hotTimerRef.current = window.setTimeout(
        () => setHotSaleFeedback(null),
        FESTIVE_ALERT_DURATION_MS
      );
    }

    if (lastSaleEvent.soldOutOutlet) {
      launchExtremeCelebration();
      setOutletCelebration(`META ATINGIDA: ${lastSaleEvent.productName} ESGOTOU NO OUTLET`);
      if (outletTimerRef.current) {
        window.clearTimeout(outletTimerRef.current);
      }
      outletTimerRef.current = window.setTimeout(
        () => setOutletCelebration(null),
        FESTIVE_ALERT_DURATION_MS
      );
    }
  }, [lastSaleEvent]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
      if (hotTimerRef.current) {
        window.clearTimeout(hotTimerRef.current);
      }
      if (outletTimerRef.current) {
        window.clearTimeout(outletTimerRef.current);
      }
    };
  }, []);

  const generatedAt = useMemo(() => {
    if (!snapshot) {
      return "carregando...";
    }
    return new Date(snapshot.generatedAt).toLocaleTimeString("pt-BR");
  }, [snapshot]);

  return (
    <div className="relative min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="glass-card mb-5 rounded-3xl p-5 shadow-joyful">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-ink md:text-4xl">GoalControl</h1>
              <p className="font-fun text-base text-ink/80 md:text-lg">
                Painel divertido para metas, vendas e performance em tempo real.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <ConnectionChip status={connectionStatus} />
              <p className="text-xs text-ink/60">Atualizado às {generatedAt}</p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={clearError}
              className="rounded-lg bg-red-200 px-2 py-1 text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
        )}

        {!snapshot ? (
          <div className="glass-card rounded-3xl p-8 text-center">
            <p className="font-display text-2xl text-ink">Aquecendo o dashboard...</p>
            <p className="mt-2 text-sm text-ink/60">Conectando com o servidor e banco.</p>
          </div>
        ) : (
          <main className="grid gap-5 xl:grid-cols-2">
            <CollapsibleTab
              title="ADMIN"
              subtitle="Gerencie produtos, vendas e metas"
              collapsed={adminCollapsed}
              onToggle={() => setAdminCollapsed((prev) => !prev)}
            >
              <AdminPanel snapshot={snapshot} />
            </CollapsibleTab>

            <CollapsibleTab
              title="DASH"
              subtitle="Gamificação, alertas e evolução em tempo real"
              collapsed={dashCollapsed}
              onToggle={() => setDashCollapsed((prev) => !prev)}
            >
              <DashboardPanel
                snapshot={snapshot}
                lastSaleEvent={lastSaleEvent}
                saleFlash={saleFlash}
                hotSaleFeedback={hotSaleFeedback}
              />
            </CollapsibleTab>
          </main>
        )}
      </div>

      {outletCelebration && (
        <div className="pointer-events-none fixed inset-0 z-[9998] grid place-items-center bg-candy/90 p-6 text-center">
          <div className="animate-bob rounded-3xl border-4 border-cream bg-cream px-8 py-6 shadow-2xl">
            <p className="font-display text-3xl text-candy md:text-4xl">META ATINGIDA</p>
            <p className="mt-2 max-w-lg font-fun text-xl text-ink">{outletCelebration}</p>
          </div>
        </div>
      )}
    </div>
  );
}
