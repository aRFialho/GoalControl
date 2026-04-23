import { useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "./components/AdminPanel";
import { DashboardPanel } from "./components/DashboardPanel";
import { launchExtremeCelebration, launchSaleConfetti } from "./lib/effects";
import { useGoalControlStore } from "./store/useGoalControlStore";

const FESTIVE_ALERT_DURATION_MS = 30_000;
const FESTIVE_ALERT_DELAY_MS = 850;
const INACTIVITY_THRESHOLD_MS = 60_000;
const INACTIVITY_REFRESH_INTERVAL_MS = 60_000;

type AppTab = "ADMIN" | "DASH";
type FestiveAlertTone = "sale" | "hot" | "goal";

interface FestiveAlert {
  title: string;
  message: string;
  tone: FestiveAlertTone;
}

function ConnectionChip({ status }: { status: "connecting" | "online" | "offline" }) {
  const palette =
    status === "online"
      ? "bg-lime text-ink"
      : status === "connecting"
        ? "bg-mango text-ink"
        : "bg-red-200 text-red-700";

  const label =
    status === "online" ? "Ao vivo" : status === "connecting" ? "Conectando" : "Offline";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${palette}`}>
      {label}
    </span>
  );
}

function TabButton({
  active,
  collapsed,
  title,
  shortTitle,
  subtitle,
  onClick
}: {
  active: boolean;
  collapsed: boolean;
  title: string;
  shortTitle: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-cyanpop bg-cyanpop/30 shadow-candy"
          : "border-white/60 bg-white/65 hover:bg-white"
      }`}
    >
      <p className="font-display text-xl text-ink">{collapsed ? shortTitle : title}</p>
      {!collapsed && <p className="mt-1 text-xs font-medium text-ink/70">{subtitle}</p>}
    </button>
  );
}

function festiveToneClasses(tone: FestiveAlertTone): { backdrop: string; glow: string; text: string } {
  if (tone === "goal") {
    return {
      backdrop: "bg-gradient-to-br from-candy/95 via-mango/90 to-lime/90",
      glow: "shadow-[0_0_120px_rgba(255,90,54,0.85)]",
      text: "text-cream"
    };
  }
  if (tone === "hot") {
    return {
      backdrop: "bg-gradient-to-br from-mango/90 via-candy/90 to-cyanpop/85",
      glow: "shadow-[0_0_120px_rgba(248,160,21,0.8)]",
      text: "text-cream"
    };
  }
  return {
    backdrop: "bg-gradient-to-br from-red-600/88 via-candy/88 to-ink/92",
    glow: "shadow-[0_0_120px_rgba(220,38,38,0.8)]",
    text: "text-cream"
  };
}

export default function App() {
  const snapshot = useGoalControlStore((state) => state.snapshot);
  const lastSaleEvent = useGoalControlStore((state) => state.lastSaleEvent);
  const connectionStatus = useGoalControlStore((state) => state.connectionStatus);
  const errorMessage = useGoalControlStore((state) => state.errorMessage);
  const clearError = useGoalControlStore((state) => state.clearError);
  const init = useGoalControlStore((state) => state.init);
  const silentRefresh = useGoalControlStore((state) => state.silentRefresh);

  const [activeTab, setActiveTab] = useState<AppTab>("DASH");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saleFlash, setSaleFlash] = useState(false);
  const [hotSaleFeedback, setHotSaleFeedback] = useState<string | null>(null);
  const [festiveAlert, setFestiveAlert] = useState<FestiveAlert | null>(null);

  const flashTimerRef = useRef<number | null>(null);
  const hotTimerRef = useRef<number | null>(null);
  const alertShowTimerRef = useRef<number | null>(null);
  const alertHideTimerRef = useRef<number | null>(null);
  const handledEventRef = useRef<number | null>(null);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const inactivityRefreshIntervalRef = useRef<number | null>(null);
  const inactiveModeRef = useRef(false);
  const silentRefreshInFlightRef = useRef(false);

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

    let nextAlert: FestiveAlert;
    if (lastSaleEvent.soldOutOutlet) {
      launchExtremeCelebration();
      nextAlert = {
        title: "META ATINGIDA",
        message: `${lastSaleEvent.productName} ESGOTOU NO OUTLET. TIME ACELEROU FORTE!`,
        tone: "goal"
      };
    } else if (lastSaleEvent.hotRelaunch) {
      nextAlert = {
        title: "PRODUTO QUENTE",
        message: lastSaleEvent.feedbackMessage,
        tone: "hot"
      };
    } else {
      nextAlert = {
        title: "NOVA VENDA",
        message: `${lastSaleEvent.productName} com ${lastSaleEvent.quantity} unidade(s) confirmada(s).`,
        tone: "sale"
      };
    }

    if (alertShowTimerRef.current) {
      window.clearTimeout(alertShowTimerRef.current);
    }
    if (alertHideTimerRef.current) {
      window.clearTimeout(alertHideTimerRef.current);
    }

    alertShowTimerRef.current = window.setTimeout(() => {
      setFestiveAlert(nextAlert);
    }, FESTIVE_ALERT_DELAY_MS);

    alertHideTimerRef.current = window.setTimeout(() => {
      setFestiveAlert(null);
    }, FESTIVE_ALERT_DELAY_MS + FESTIVE_ALERT_DURATION_MS);
  }, [lastSaleEvent]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
      if (hotTimerRef.current) {
        window.clearTimeout(hotTimerRef.current);
      }
      if (alertShowTimerRef.current) {
        window.clearTimeout(alertShowTimerRef.current);
      }
      if (alertHideTimerRef.current) {
        window.clearTimeout(alertHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const doSilentRefresh = () => {
      if (silentRefreshInFlightRef.current) {
        return;
      }
      silentRefreshInFlightRef.current = true;
      void silentRefresh().finally(() => {
        silentRefreshInFlightRef.current = false;
      });
    };

    const stopInactiveRefresh = () => {
      inactiveModeRef.current = false;
      if (inactivityRefreshIntervalRef.current) {
        window.clearInterval(inactivityRefreshIntervalRef.current);
        inactivityRefreshIntervalRef.current = null;
      }
    };

    const startInactiveRefresh = () => {
      if (inactiveModeRef.current) {
        return;
      }
      inactiveModeRef.current = true;
      doSilentRefresh();
      inactivityRefreshIntervalRef.current = window.setInterval(
        doSilentRefresh,
        INACTIVITY_REFRESH_INTERVAL_MS
      );
    };

    const scheduleInactiveMode = () => {
      if (inactivityTimeoutRef.current) {
        window.clearTimeout(inactivityTimeoutRef.current);
      }
      inactivityTimeoutRef.current = window.setTimeout(
        startInactiveRefresh,
        INACTIVITY_THRESHOLD_MS
      );
    };

    const onUserActivity = () => {
      stopInactiveRefresh();
      scheduleInactiveMode();
    };

    scheduleInactiveMode();

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "focus"
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, onUserActivity);
    }

    return () => {
      if (inactivityTimeoutRef.current) {
        window.clearTimeout(inactivityTimeoutRef.current);
      }
      stopInactiveRefresh();
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, onUserActivity);
      }
    };
  }, [silentRefresh]);

  const generatedAt = useMemo(() => {
    if (!snapshot) {
      return "carregando...";
    }
    return new Date(snapshot.generatedAt).toLocaleTimeString("pt-BR");
  }, [snapshot]);

  const tone = festiveAlert ? festiveToneClasses(festiveAlert.tone) : null;

  return (
    <div className="relative min-h-screen p-3 md:p-6">
      <div className="w-full">
        <header className="glass-card mb-4 rounded-3xl p-5 shadow-joyful">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl text-ink md:text-4xl">GoalControl</h1>
              <p className="font-fun text-base text-ink/80 md:text-lg break-words">
                Painel divertido para metas, vendas e performance em tempo real.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <ConnectionChip status={connectionStatus} />
              <p className="text-xs text-ink/60">Atualizado as {generatedAt}</p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">
            <span className="break-words pr-2">{errorMessage}</span>
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
          <div className="grid min-w-0 gap-4 lg:grid-cols-[auto,1fr]">
            <aside
              className={`glass-card rounded-3xl p-3 shadow-joyful transition-all duration-300 ${
                sidebarCollapsed ? "lg:w-24" : "lg:w-72"
              }`}
            >
              <div
                className={`mb-3 flex items-center ${
                  sidebarCollapsed ? "justify-center" : "justify-between"
                }`}
              >
                {!sidebarCollapsed && (
                  <h2 className="font-display text-xl text-ink">Abas</h2>
                )}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="rounded-xl bg-ink px-3 py-2 text-xs font-bold uppercase text-white"
                  title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                  {sidebarCollapsed ? ">" : "<"}
                </button>
              </div>

              <div className="grid gap-2">
                <TabButton
                  active={activeTab === "ADMIN"}
                  collapsed={sidebarCollapsed}
                  title="ADMIN"
                  shortTitle="A"
                  subtitle="Produtos, vendas e metas"
                  onClick={() => setActiveTab("ADMIN")}
                />
                <TabButton
                  active={activeTab === "DASH"}
                  collapsed={sidebarCollapsed}
                  title="DASH"
                  shortTitle="D"
                  subtitle="KPI, graficos e alertas"
                  onClick={() => setActiveTab("DASH")}
                />
              </div>
            </aside>

            <main className="min-w-0 w-full">
              {activeTab === "ADMIN" ? (
                <AdminPanel snapshot={snapshot} />
              ) : (
                <DashboardPanel
                  snapshot={snapshot}
                  lastSaleEvent={lastSaleEvent}
                  saleFlash={saleFlash}
                  hotSaleFeedback={hotSaleFeedback}
                />
              )}
            </main>
          </div>
        )}
      </div>

      {festiveAlert && tone && (
        <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden">
          <div className={`absolute inset-0 ${tone.backdrop} animate-pulse`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.35),transparent_55%)]" />
          <div className="relative flex h-full w-full items-center justify-center p-5 text-center">
            <div className={`max-w-5xl rounded-[42px] border-4 border-cream/80 bg-ink/35 px-8 py-10 backdrop-blur-sm ${tone.glow}`}>
              <p className={`font-display text-5xl leading-tight md:text-7xl ${tone.text} animate-bounce`}>
                {festiveAlert.title}
              </p>
              <p className={`mt-4 font-fun text-2xl md:text-4xl ${tone.text} break-words`}>
                {festiveAlert.message}
              </p>
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.28em] text-cream/90 md:text-base">
                CADA VENDA E UM PASSO A MAIS RUMO A META
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
