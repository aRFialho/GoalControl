import { PoolClient } from "pg";
import { query, withTransaction } from "./db";
import {
  DashboardCharts,
  DashboardKpis,
  DashboardSnapshot,
  Goals,
  HotProduct,
  HotStats,
  Product,
  ProductType,
  RecentSale,
  SalesChartPoint,
  SaleEvent
} from "./types";

type Queryable = Pick<PoolClient, "query">;

interface ProductRow {
  id: string;
  type: ProductType;
  imageUrl: string;
  name: string;
  reference: string;
  stock: number;
}

interface GoalRow {
  month: number;
  week: number;
  fortnight: number;
}

interface TotalsRow {
  month: number;
  week: number;
  fortnight: number;
}

interface HotRow {
  productId: string;
  name: string;
  weekSales: number;
  todaySales: number;
  last15DaysSales: number;
}

interface RecentSaleRow {
  id: number;
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  createdAt: Date;
}

interface GoalStatusRow {
  goalsHit: number;
  goalsFailed: number;
}

interface TotalMeasuredSalesRow {
  totalMeasuredSales: number;
}

interface SalesChartPointRow {
  label: string;
  value: number;
  periodStart: Date;
  periodEnd: Date;
}

interface SaleInsertRow {
  id: number;
  createdAt: Date;
}

interface ProductUpdateRow {
  id: string;
  type: ProductType;
  imageUrl: string;
  name: string;
  reference: string;
  stock: number;
}

export interface ProductPayload {
  type: ProductType;
  imageUrl: string;
  name: string;
  reference: string;
  stock: number;
}

async function insertProduct(
  executor: Queryable,
  input: ProductPayload
): Promise<Product> {
  const result = await executor.query<ProductRow>(
    `
      INSERT INTO products (type, image_url, name, reference, stock)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        type,
        image_url AS "imageUrl",
        name,
        reference,
        stock
    `,
    [input.type, input.imageUrl, input.name, input.reference, input.stock]
  );
  return mapProduct(result.rows[0]);
}

function toMotivation(name: string, hotStats: HotStats): string {
  if (hotStats.today > 2) {
    return `${name} está fervendo hoje. Bora empurrar essa vitrine até zerar.`;
  }
  if (hotStats.week >= 5) {
    return `${name} passou de 5 vendas semanais. Ótimo ritmo para escalar agora.`;
  }
  return `${name} virou sensação dos últimos 15 dias. Acelera o relaunch com energia total.`;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    type: row.type,
    imageUrl: row.imageUrl,
    name: row.name,
    reference: row.reference,
    stock: Number(row.stock)
  };
}

async function fetchProducts(): Promise<Product[]> {
  const { rows } = await query<ProductRow>(
    `
      SELECT
        id,
        type,
        image_url AS "imageUrl",
        name,
        reference,
        stock
      FROM products
      ORDER BY type, name ASC
    `
  );
  return rows.map(mapProduct);
}

async function fetchGoals(): Promise<Goals> {
  const { rows } = await query<GoalRow>(
    `
      SELECT
        monthly_goal AS month,
        weekly_goal AS week,
        biweekly_goal AS fortnight
      FROM goals
      WHERE id = 1
    `
  );

  if (rows.length === 0) {
    await ensureGoalSeed();
    return { month: 0, week: 0, fortnight: 0 };
  }

  return {
    month: Number(rows[0].month),
    week: Number(rows[0].week),
    fortnight: Number(rows[0].fortnight)
  };
}

async function fetchTotals(): Promise<TotalsRow> {
  const { rows } = await query<TotalsRow>(
    `
      SELECT
        COALESCE(SUM(quantity) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::INT AS month,
        COALESCE(SUM(quantity) FILTER (WHERE created_at >= date_trunc('week', NOW())), 0)::INT AS week,
        COALESCE(SUM(quantity) FILTER (WHERE created_at >= NOW() - INTERVAL '15 days'), 0)::INT AS fortnight
      FROM sales
    `
  );

  return {
    month: Number(rows[0]?.month ?? 0),
    week: Number(rows[0]?.week ?? 0),
    fortnight: Number(rows[0]?.fortnight ?? 0)
  };
}

function mapChartPoint(row: SalesChartPointRow): SalesChartPoint {
  return {
    label: row.label,
    value: Number(row.value),
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString()
  };
}

async function fetchGoalStatusForPeriod(
  period: "month" | "week" | "fortnight",
  goalValue: number
): Promise<GoalStatusRow> {
  if (goalValue <= 0) {
    return { goalsHit: 0, goalsFailed: 0 };
  }

  const sqlByPeriod: Record<typeof period, string> = {
    month: `
      WITH bounds AS (
        SELECT date_trunc('month', MIN(created_at)) AS first_period
        FROM sales
      ),
      periods AS (
        SELECT generate_series(
          (SELECT first_period FROM bounds),
          date_trunc('month', NOW()) - INTERVAL '1 month',
          INTERVAL '1 month'
        ) AS period_start
      ),
      period_sales AS (
        SELECT
          p.period_start,
          COALESCE(SUM(s.quantity), 0)::INT AS sales_total
        FROM periods p
        LEFT JOIN sales s
          ON s.created_at >= p.period_start
          AND s.created_at < p.period_start + INTERVAL '1 month'
        GROUP BY p.period_start
      )
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE sales_total >= $1), 0)::INT AS "goalsHit",
        COALESCE(COUNT(*) FILTER (WHERE sales_total < $1), 0)::INT AS "goalsFailed"
      FROM period_sales
    `,
    week: `
      WITH bounds AS (
        SELECT date_trunc('week', MIN(created_at)) AS first_period
        FROM sales
      ),
      periods AS (
        SELECT generate_series(
          (SELECT first_period FROM bounds),
          date_trunc('week', NOW()) - INTERVAL '1 week',
          INTERVAL '1 week'
        ) AS period_start
      ),
      period_sales AS (
        SELECT
          p.period_start,
          COALESCE(SUM(s.quantity), 0)::INT AS sales_total
        FROM periods p
        LEFT JOIN sales s
          ON s.created_at >= p.period_start
          AND s.created_at < p.period_start + INTERVAL '1 week'
        GROUP BY p.period_start
      )
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE sales_total >= $1), 0)::INT AS "goalsHit",
        COALESCE(COUNT(*) FILTER (WHERE sales_total < $1), 0)::INT AS "goalsFailed"
      FROM period_sales
    `,
    fortnight: `
      WITH bounds AS (
        SELECT date_trunc('day', MIN(created_at)) AS first_period
        FROM sales
      ),
      periods AS (
        SELECT generate_series(
          (SELECT first_period FROM bounds),
          date_trunc('day', NOW()) - INTERVAL '15 day',
          INTERVAL '15 day'
        ) AS period_start
      ),
      period_sales AS (
        SELECT
          p.period_start,
          COALESCE(SUM(s.quantity), 0)::INT AS sales_total
        FROM periods p
        LEFT JOIN sales s
          ON s.created_at >= p.period_start
          AND s.created_at < p.period_start + INTERVAL '15 day'
        GROUP BY p.period_start
      )
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE sales_total >= $1), 0)::INT AS "goalsHit",
        COALESCE(COUNT(*) FILTER (WHERE sales_total < $1), 0)::INT AS "goalsFailed"
      FROM period_sales
    `
  };

  const { rows } = await query<GoalStatusRow>(sqlByPeriod[period], [goalValue]);
  return {
    goalsHit: Number(rows[0]?.goalsHit ?? 0),
    goalsFailed: Number(rows[0]?.goalsFailed ?? 0)
  };
}

async function fetchKpis(goals: Goals): Promise<DashboardKpis> {
  const [monthStatus, weekStatus, fortnightStatus, totalSales] = await Promise.all([
    fetchGoalStatusForPeriod("month", goals.month),
    fetchGoalStatusForPeriod("week", goals.week),
    fetchGoalStatusForPeriod("fortnight", goals.fortnight),
    query<TotalMeasuredSalesRow>(
      `
        SELECT
          COALESCE(SUM(quantity), 0)::INT AS "totalMeasuredSales"
        FROM sales
      `
    )
  ]);

  return {
    goalsHit:
      Number(monthStatus.goalsHit) +
      Number(weekStatus.goalsHit) +
      Number(fortnightStatus.goalsHit),
    goalsFailed:
      Number(monthStatus.goalsFailed) +
      Number(weekStatus.goalsFailed) +
      Number(fortnightStatus.goalsFailed),
    totalMeasuredSales: Number(totalSales.rows[0]?.totalMeasuredSales ?? 0)
  };
}

async function fetchDailySalesChart(): Promise<SalesChartPoint[]> {
  const { rows } = await query<SalesChartPointRow>(
    `
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW()) - INTERVAL '13 day',
          date_trunc('day', NOW()),
          INTERVAL '1 day'
        ) AS day_start
      )
      SELECT
        TO_CHAR(day_start, 'DD/MM') AS label,
        COALESCE(SUM(s.quantity), 0)::INT AS value,
        day_start AS "periodStart",
        day_start + INTERVAL '1 day' AS "periodEnd"
      FROM days
      LEFT JOIN sales s
        ON s.created_at >= day_start
        AND s.created_at < day_start + INTERVAL '1 day'
      GROUP BY day_start
      ORDER BY day_start ASC
    `
  );

  return rows.map(mapChartPoint);
}

async function fetchMonthlySalesChart(): Promise<SalesChartPoint[]> {
  const { rows } = await query<SalesChartPointRow>(
    `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - INTERVAL '11 month',
          date_trunc('month', NOW()),
          INTERVAL '1 month'
        ) AS month_start
      )
      SELECT
        TO_CHAR(month_start, 'MM/YYYY') AS label,
        COALESCE(SUM(s.quantity), 0)::INT AS value,
        month_start AS "periodStart",
        month_start + INTERVAL '1 month' AS "periodEnd"
      FROM months
      LEFT JOIN sales s
        ON s.created_at >= month_start
        AND s.created_at < month_start + INTERVAL '1 month'
      GROUP BY month_start
      ORDER BY month_start ASC
    `
  );

  return rows.map(mapChartPoint);
}

async function fetchCharts(): Promise<DashboardCharts> {
  const [dailySales, monthlySales] = await Promise.all([
    fetchDailySalesChart(),
    fetchMonthlySalesChart()
  ]);

  return {
    dailySales,
    monthlySales
  };
}

async function fetchHotRelaunches(): Promise<HotProduct[]> {
  const { rows } = await query<HotRow>(
    `
      WITH relaunch_stats AS (
        SELECT
          p.id AS "productId",
          p.name,
          COALESCE(SUM(s.quantity) FILTER (WHERE s.created_at >= date_trunc('week', NOW())), 0)::INT AS "weekSales",
          COALESCE(SUM(s.quantity) FILTER (WHERE s.created_at >= date_trunc('day', NOW())), 0)::INT AS "todaySales",
          COALESCE(SUM(s.quantity) FILTER (WHERE s.created_at >= NOW() - INTERVAL '15 days'), 0)::INT AS "last15DaysSales"
        FROM products p
        LEFT JOIN sales s ON s.product_id = p.id
        WHERE p.type = 'RELAUNCH'
        GROUP BY p.id, p.name
      )
      SELECT
        "productId",
        name,
        "weekSales",
        "todaySales",
        "last15DaysSales"
      FROM relaunch_stats
      WHERE "weekSales" >= 5 OR "todaySales" > 2 OR "last15DaysSales" > 10
      ORDER BY "weekSales" DESC, "todaySales" DESC, "last15DaysSales" DESC
    `
  );

  return rows.map((row) => {
    const hotStats: HotStats = {
      week: Number(row.weekSales),
      today: Number(row.todaySales),
      last15: Number(row.last15DaysSales)
    };
    return {
      productId: row.productId,
      name: row.name,
      weekSales: hotStats.week,
      todaySales: hotStats.today,
      last15DaysSales: hotStats.last15,
      motivation: toMotivation(row.name, hotStats)
    };
  });
}

async function fetchRecentSales(): Promise<RecentSale[]> {
  const { rows } = await query<RecentSaleRow>(
    `
      SELECT
        s.id,
        p.id AS "productId",
        p.name AS "productName",
        p.type AS "productType",
        s.quantity,
        s.created_at AS "createdAt"
      FROM sales s
      INNER JOIN products p ON p.id = s.product_id
      ORDER BY s.created_at DESC
      LIMIT 8
    `
  );

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    productType: row.productType,
    quantity: Number(row.quantity),
    createdAt: row.createdAt.toISOString()
  }));
}

export async function ensureGoalSeed(): Promise<void> {
  await query(
    `
      INSERT INTO goals (id, monthly_goal, weekly_goal, biweekly_goal)
      VALUES (1, 0, 0, 0)
      ON CONFLICT (id) DO NOTHING
    `
  );
}

export async function getSnapshot(): Promise<DashboardSnapshot> {
  const goals = await fetchGoals();
  const [products, totals, kpis, charts, hotRelaunches, recentSales] = await Promise.all([
    fetchProducts(),
    fetchTotals(),
    fetchKpis(goals),
    fetchCharts(),
    fetchHotRelaunches(),
    fetchRecentSales()
  ]);

  return {
    products,
    goals,
    totals,
    kpis,
    charts,
    hotRelaunches,
    recentSales,
    generatedAt: new Date().toISOString()
  };
}

export async function createProduct(input: ProductPayload): Promise<Product> {
  const { rows } = await query<ProductRow>(
    `
      INSERT INTO products (type, image_url, name, reference, stock)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        type,
        image_url AS "imageUrl",
        name,
        reference,
        stock
    `,
    [input.type, input.imageUrl, input.name, input.reference, input.stock]
  );
  return mapProduct(rows[0]);
}

export async function createProductsBatch(
  inputs: ProductPayload[]
): Promise<Product[]> {
  if (inputs.length === 0) {
    return [];
  }

  return withTransaction(async (client) => {
    const created: Product[] = [];
    for (const input of inputs) {
      const product = await insertProduct(client, input);
      created.push(product);
    }
    return created;
  });
}

export async function updateProduct(
  productId: string,
  input: ProductPayload
): Promise<Product> {
  const { rows, rowCount } = await query<ProductRow>(
    `
      UPDATE products
      SET
        type = $2,
        image_url = $3,
        name = $4,
        reference = $5,
        stock = $6,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        type,
        image_url AS "imageUrl",
        name,
        reference,
        stock
    `,
    [productId, input.type, input.imageUrl, input.name, input.reference, input.stock]
  );

  if (rowCount === 0) {
    throw new Error("Produto não encontrado.");
  }

  return mapProduct(rows[0]);
}

export async function deleteProductAndHistory(productId: string): Promise<void> {
  await withTransaction(async (client) => {
    const exists = await client.query<{ id: string }>(
      `
        SELECT id
        FROM products
        WHERE id = $1
        FOR UPDATE
      `,
      [productId]
    );

    if ((exists.rowCount ?? 0) === 0) {
      throw new Error("Produto nao encontrado para exclusao.");
    }

    await client.query("DELETE FROM products WHERE id = $1", [productId]);
  });
}

export async function updateGoals(goals: Goals): Promise<Goals> {
  const { rows } = await query<GoalRow>(
    `
      INSERT INTO goals (id, monthly_goal, weekly_goal, biweekly_goal, updated_at)
      VALUES (1, $1, $2, $3, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        monthly_goal = EXCLUDED.monthly_goal,
        weekly_goal = EXCLUDED.weekly_goal,
        biweekly_goal = EXCLUDED.biweekly_goal,
        updated_at = NOW()
      RETURNING
        monthly_goal AS month,
        weekly_goal AS week,
        biweekly_goal AS fortnight
    `,
    [goals.month, goals.week, goals.fortnight]
  );

  return {
    month: Number(rows[0].month),
    week: Number(rows[0].week),
    fortnight: Number(rows[0].fortnight)
  };
}

async function getHotStatsForProduct(
  productId: string,
  executor: Queryable
): Promise<HotStats> {
  const result = await executor.query<{
    week: number;
    today: number;
    last15: number;
  }>(
    `
      SELECT
        COALESCE(SUM(quantity) FILTER (WHERE created_at >= date_trunc('week', NOW())), 0)::INT AS week,
        COALESCE(SUM(quantity) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0)::INT AS today,
        COALESCE(SUM(quantity) FILTER (WHERE created_at >= NOW() - INTERVAL '15 days'), 0)::INT AS last15
      FROM sales
      WHERE product_id = $1
    `,
    [productId]
  );

  return {
    week: Number(result.rows[0]?.week ?? 0),
    today: Number(result.rows[0]?.today ?? 0),
    last15: Number(result.rows[0]?.last15 ?? 0)
  };
}

function toSaleFeedback(
  updatedProduct: ProductUpdateRow,
  soldOutOutlet: boolean,
  hotRelaunch: boolean,
  hotStats: HotStats | null
): string {
  if (soldOutOutlet) {
    return `Meta Atingida: ${updatedProduct.name} esgotou no Outlet. Time voando!`;
  }

  if (hotRelaunch && hotStats) {
    return toMotivation(updatedProduct.name, hotStats);
  }

  return `Venda confirmada para ${updatedProduct.name}. Mantém o ritmo.`;
}

export async function announceSale(
  productId: string,
  quantity: number
): Promise<{ snapshot: DashboardSnapshot; event: SaleEvent }> {
  const event = await withTransaction(async (client) => {
    const productLookup = await client.query<ProductUpdateRow>(
      `
        SELECT
          id,
          type,
          image_url AS "imageUrl",
          name,
          reference,
          stock
        FROM products
        WHERE id = $1
        FOR UPDATE
      `,
      [productId]
    );

    if ((productLookup.rowCount ?? 0) === 0) {
      throw new Error("Produto não encontrado para anúncio de venda.");
    }

    const currentProduct = productLookup.rows[0];

    if (Number(currentProduct.stock) < quantity) {
      throw new Error("Estoque insuficiente para concluir a venda.");
    }

    const stockUpdate = await client.query<ProductUpdateRow>(
      `
        UPDATE products
        SET
          stock = stock - $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          type,
          image_url AS "imageUrl",
          name,
          reference,
          stock
      `,
      [quantity, productId]
    );

    const updatedProduct = stockUpdate.rows[0];
    const saleInsert = await client.query<SaleInsertRow>(
      `
        INSERT INTO sales (product_id, quantity)
        VALUES ($1, $2)
        RETURNING
          id,
          created_at AS "createdAt"
      `,
      [productId, quantity]
    );
    const insertedSale = saleInsert.rows[0];

    const hotStats =
      updatedProduct.type === "RELAUNCH"
        ? await getHotStatsForProduct(productId, client)
        : null;

    const soldOutOutlet =
      updatedProduct.type === "OUTLET" && Number(updatedProduct.stock) === 0;
    const hotRelaunch =
      updatedProduct.type === "RELAUNCH" &&
      hotStats !== null &&
      (hotStats.week >= 5 || hotStats.today > 2 || hotStats.last15 > 10);

    return {
      id: insertedSale.id,
      productId: updatedProduct.id,
      productName: updatedProduct.name,
      productType: updatedProduct.type,
      quantity,
      soldOutOutlet,
      hotRelaunch,
      hotStats,
      feedbackMessage: toSaleFeedback(
        updatedProduct,
        soldOutOutlet,
        hotRelaunch,
        hotStats
      ),
      createdAt: insertedSale.createdAt.toISOString()
    } satisfies SaleEvent;
  });

  const snapshot = await getSnapshot();
  return { snapshot, event };
}

export async function cancelSale(
  saleId: number
): Promise<{ snapshot: DashboardSnapshot; canceledSaleId: number }> {
  await withTransaction(async (client) => {
    const saleLookup = await client.query<{
      id: number;
      productId: string;
      quantity: number;
    }>(
      `
        SELECT
          s.id,
          s.product_id AS "productId",
          s.quantity
        FROM sales s
        WHERE s.id = $1
      `,
      [saleId]
    );

    if ((saleLookup.rowCount ?? 0) === 0) {
      throw new Error("Venda nao encontrada para cancelamento.");
    }

    const sale = saleLookup.rows[0];

    const productLock = await client.query<{ id: string }>(
      `
        SELECT id
        FROM products
        WHERE id = $1
        FOR UPDATE
      `,
      [sale.productId]
    );

    if ((productLock.rowCount ?? 0) === 0) {
      throw new Error("Produto da venda nao encontrado para estorno.");
    }

    await client.query(
      `
        UPDATE products
        SET
          stock = stock + $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [sale.quantity, sale.productId]
    );

    await client.query("DELETE FROM sales WHERE id = $1", [saleId]);
  });

  const snapshot = await getSnapshot();
  return { snapshot, canceledSaleId: saleId };
}
