import { Pool, PoolClient, QueryResultRow } from "pg";
import { requireEnv } from "./env";

const connectionString = requireEnv("DATABASE_URL");

export const pool = new Pool({ connectionString });

export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await pool.query<T>(sql, params);
  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const data = await fn(client);
    await client.query("COMMIT");
    return data;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
