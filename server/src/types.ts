export type ProductType = "OUTLET" | "RELAUNCH";

export interface Product {
  id: string;
  type: ProductType;
  imageUrl: string;
  name: string;
  reference: string;
  stock: number;
}

export interface Goals {
  month: number;
  week: number;
  fortnight: number;
}

export interface SalesTotals {
  month: number;
  week: number;
  fortnight: number;
}

export interface HotProduct {
  productId: string;
  name: string;
  weekSales: number;
  todaySales: number;
  last15DaysSales: number;
  motivation: string;
}

export interface RecentSale {
  id: number;
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  createdAt: string;
}

export interface DashboardKpis {
  goalsHit: number;
  goalsFailed: number;
  totalMeasuredSales: number;
}

export interface SalesChartPoint {
  label: string;
  value: number;
  periodStart: string;
  periodEnd: string;
}

export interface DashboardCharts {
  dailySales: SalesChartPoint[];
  monthlySales: SalesChartPoint[];
}

export interface DashboardSnapshot {
  products: Product[];
  goals: Goals;
  totals: SalesTotals;
  kpis: DashboardKpis;
  charts: DashboardCharts;
  hotRelaunches: HotProduct[];
  recentSales: RecentSale[];
  generatedAt: string;
}

export interface HotStats {
  week: number;
  today: number;
  last15: number;
}

export interface SaleEvent {
  id: number;
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  soldOutOutlet: boolean;
  hotRelaunch: boolean;
  hotStats: HotStats | null;
  feedbackMessage: string;
  createdAt: string;
}

export type WsMessage =
  | { type: "state.snapshot"; snapshot: DashboardSnapshot }
  | { type: "sale.event"; snapshot: DashboardSnapshot; event: SaleEvent };
