import { useMemo, useState } from "react";
import { DashboardSnapshot, SaleEvent, SalesChartPoint } from "../lib/types";

interface DashboardPanelProps {
  snapshot: DashboardSnapshot;
  lastSaleEvent: SaleEvent | null;
  saleFlash: boolean;
  hotSaleFeedback: string | null;
}

function progressPercent(current: number, goal: number): number {
  if (goal <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((current / goal) * 100));
}

function SalesBarChart({
  points,
  barClassName
}: {
  points: SalesChartPoint[];
  barClassName: string;
}) {
  const maxValue = useMemo(
    () => Math.max(1, ...points.map((point) => Number(point.value) || 0)),
    [points]
  );

  if (points.length === 0) {
    return <p className="text-sm text-ink/60">Sem historico de vendas para exibir.</p>;
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-[640px] items-end gap-2">
        {points.map((point) => {
          const height = Math.max(8, Math.round((point.value / maxValue) * 130));
          return (
            <div key={`${point.label}-${point.periodStart}`} className="w-11 shrink-0">
              <div className="flex h-[170px] flex-col justify-end rounded-xl bg-ink/5 p-1">
                <div
                  className={`w-full rounded-lg ${barClassName}`}
                  style={{ height: `${height}px` }}
                  title={`${point.label}: ${point.value}`}
                />
              </div>
              <p className="mt-1 truncate text-center text-[10px] font-semibold text-ink/75">
                {point.label}
              </p>
              <p className="text-center text-[11px] font-bold text-ink">{point.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardPanel({
  snapshot,
  lastSaleEvent,
  saleFlash,
  hotSaleFeedback
}: DashboardPanelProps) {
  const [kpisCollapsed, setKpisCollapsed] = useState(false);
  const [dailyChartCollapsed, setDailyChartCollapsed] = useState(false);
  const [monthlyChartCollapsed, setMonthlyChartCollapsed] = useState(false);

  const progress = {
    month: progressPercent(snapshot.totals.month, snapshot.goals.month),
    week: progressPercent(snapshot.totals.week, snapshot.goals.week),
    fortnight: progressPercent(snapshot.totals.fortnight, snapshot.goals.fortnight)
  };

  const zeroStock = snapshot.products.filter((product) => product.stock === 0).length;

  return (
    <div className="grid min-w-0 gap-5">
      <div className="glass-card rounded-2xl border border-white/70 p-4">
        <h3 className="font-display text-lg text-ink">Placar em Tempo Real</h3>
        <p className="text-sm text-ink/70">
          Dashboard gamificado com feedback instantaneo a cada venda anunciada.
        </p>

        {saleFlash && (
          <div className="mt-3 animate-blink rounded-xl border-2 border-red-600 bg-red-100 px-3 py-2 text-sm font-bold text-red-700">
            Nova venda registrada. Energia total no time.
          </div>
        )}

        {hotSaleFeedback && (
          <div className="mt-3 animate-bob rounded-xl bg-gradient-to-r from-mango/25 to-cyanpop/25 px-3 py-2 text-sm font-semibold text-ink">
            Produto Quente: {hotSaleFeedback}
          </div>
        )}
      </div>

      <section className="glass-card rounded-2xl border border-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-base text-ink">KPIs no Topo</h4>
          <button
            type="button"
            onClick={() => setKpisCollapsed((prev) => !prev)}
            className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white transition hover:scale-105"
          >
            {kpisCollapsed ? "Expandir" : "Recolher"}
          </button>
        </div>

        {!kpisCollapsed ? (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-lime/30 bg-lime/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/70">
                Metas batidas
              </p>
              <p className="mt-1 font-display text-3xl text-lime">{snapshot.kpis.goalsHit}</p>
              <p className="text-xs text-ink/70">
                Periodos fechados em que a meta foi alcancada.
              </p>
            </article>

            <article className="rounded-2xl border border-red-300 bg-red-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/70">
                Metas falhas
              </p>
              <p className="mt-1 font-display text-3xl text-red-600">
                {snapshot.kpis.goalsFailed}
              </p>
              <p className="text-xs text-ink/70">
                Periodos fechados em que a meta nao foi batida.
              </p>
            </article>

            <article className="rounded-2xl border border-cyanpop/30 bg-cyanpop/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/70">
                Total de vendas metrificadas
              </p>
              <p className="mt-1 font-display text-3xl text-cyanpop">
                {snapshot.kpis.totalMeasuredSales}
              </p>
              <p className="text-xs text-ink/70">
                Soma historica de todas as vendas registradas.
              </p>
            </article>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">KPIs recolhidos.</p>
        )}
      </section>

      <section className="glass-card rounded-2xl border border-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-base text-ink">Grafico de Vendas - Dias</h4>
          <button
            type="button"
            onClick={() => setDailyChartCollapsed((prev) => !prev)}
            className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white transition hover:scale-105"
          >
            {dailyChartCollapsed ? "Expandir" : "Recolher"}
          </button>
        </div>

        {!dailyChartCollapsed ? (
          <div className="mt-3">
            <SalesBarChart points={snapshot.charts.dailySales} barClassName="bg-mango" />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">Grafico diario recolhido.</p>
        )}
      </section>

      <section className="glass-card rounded-2xl border border-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-base text-ink">Grafico de Vendas - Meses</h4>
          <button
            type="button"
            onClick={() => setMonthlyChartCollapsed((prev) => !prev)}
            className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white transition hover:scale-105"
          >
            {monthlyChartCollapsed ? "Expandir" : "Recolher"}
          </button>
        </div>

        {!monthlyChartCollapsed ? (
          <div className="mt-3">
            <SalesBarChart points={snapshot.charts.monthlySales} barClassName="bg-candy" />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">Grafico mensal recolhido.</p>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="glass-card animate-pulseRing rounded-2xl border border-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/70">Meta Mensal</p>
          <p className="mt-1 font-display text-2xl text-candy">
            {snapshot.totals.month} / {snapshot.goals.month || "-"}
          </p>
          <div className="mt-2 h-2 rounded-full bg-ink/10">
            <div className="h-2 rounded-full bg-candy" style={{ width: `${progress.month}%` }} />
          </div>
        </article>

        <article className="glass-card animate-pulseRing rounded-2xl border border-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/70">Meta Semanal</p>
          <p className="mt-1 font-display text-2xl text-mango">
            {snapshot.totals.week} / {snapshot.goals.week || "-"}
          </p>
          <div className="mt-2 h-2 rounded-full bg-ink/10">
            <div className="h-2 rounded-full bg-mango" style={{ width: `${progress.week}%` }} />
          </div>
        </article>

        <article className="glass-card animate-pulseRing rounded-2xl border border-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/70">Meta Quinzena</p>
          <p className="mt-1 font-display text-2xl text-lime">
            {snapshot.totals.fortnight} / {snapshot.goals.fortnight || "-"}
          </p>
          <div className="mt-2 h-2 rounded-full bg-ink/10">
            <div className="h-2 rounded-full bg-lime" style={{ width: `${progress.fortnight}%` }} />
          </div>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="glass-card rounded-2xl border border-white/70 p-4">
          <h4 className="font-display text-base text-ink">Produtos Quentes</h4>
          <div className="mt-2 grid gap-2">
            {snapshot.hotRelaunches.length === 0 && (
              <p className="text-sm text-ink/60">Nenhum relaunch aqueceu ainda.</p>
            )}
            {snapshot.hotRelaunches.map((hot) => (
              <div key={hot.productId} className="rounded-xl bg-white/70 p-3 text-sm">
                <p className="font-semibold text-candy">{hot.name}</p>
                <p className="text-ink/70">
                  Semana: {hot.weekSales} | Hoje: {hot.todaySales} | 15 dias: {hot.last15DaysSales}
                </p>
                <p className="mt-1 font-medium text-ink">{hot.motivation}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-2xl border border-white/70 p-4">
          <h4 className="font-display text-base text-ink">Radar de Estoque</h4>
          <p className="text-sm text-ink/70">Produtos zerados agora: {zeroStock}</p>
          <div className="mt-2 grid max-h-56 gap-2 overflow-auto pr-1">
            {snapshot.products.map((product) => (
              <div
                key={product.id}
                className={`rounded-xl p-2 text-sm ${
                  product.stock === 0
                    ? "animate-bob bg-red-100 text-red-700"
                    : "bg-white/70 text-ink"
                }`}
              >
                <p className="font-semibold">
                  {product.name} <span className="text-xs">({product.type})</span>
                </p>
                <p>Ref: {product.reference}</p>
                <p>Estoque: {product.stock}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="glass-card rounded-2xl border border-white/70 p-4">
        <h4 className="font-display text-base text-ink">Feed de Vendas</h4>
        <div className="mt-2 grid gap-2">
          {snapshot.recentSales.length === 0 && (
            <p className="text-sm text-ink/60">Sem vendas registradas por enquanto.</p>
          )}
          {snapshot.recentSales.map((sale) => (
            <div key={sale.id} className="rounded-xl bg-white/70 p-3 text-sm">
              <p className="font-semibold text-ink">
                {sale.productName} • {sale.quantity} unidade(s)
              </p>
              <p className="text-ink/70">
                {new Date(sale.createdAt).toLocaleString("pt-BR")} • {sale.productType}
              </p>
            </div>
          ))}
        </div>
      </article>

      {lastSaleEvent && (
        <article className="glass-card rounded-2xl border border-white/70 p-4">
          <h4 className="font-display text-base text-ink">Ultimo Evento</h4>
          <p className="text-sm text-ink">
            {lastSaleEvent.productName} • {lastSaleEvent.quantity} unidade(s) •{" "}
            {new Date(lastSaleEvent.createdAt).toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-sm font-semibold text-candy">{lastSaleEvent.feedbackMessage}</p>
        </article>
      )}
    </div>
  );
}
