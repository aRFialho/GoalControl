import { ReactNode } from "react";

interface CollapsibleTabProps {
  title: string;
  subtitle: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleTab({
  title,
  subtitle,
  collapsed,
  onToggle,
  children
}: CollapsibleTabProps) {
  return (
    <section className="glass-card rounded-3xl p-4 shadow-joyful md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          <p className="text-sm font-body text-ink/70">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:scale-105"
        >
          {collapsed ? "Expandir" : "Recolher"}
        </button>
      </div>
      {!collapsed ? children : <p className="text-sm text-ink/60">Painel recolhido.</p>}
    </section>
  );
}

