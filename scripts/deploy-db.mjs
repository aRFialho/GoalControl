import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não encontrado no arquivo .env");
}

const client = new pg.Client({ connectionString: databaseUrl });

async function deployMigrations() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migratesDir = path.join(rootDir, "migrates");
  const files = (await fs.readdir(migratesDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const applied = await client.query("SELECT filename FROM schema_migrations");
  const appliedSet = new Set(applied.rows.map((row) => row.filename));

  if (files.length === 0) {
    console.log("Nenhuma migração encontrada em migrates/.");
    return;
  }

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`- ${file}: já aplicada`);
      continue;
    }

    const sql = await fs.readFile(path.join(migratesDir, file), "utf-8");
    console.log(`- Aplicando ${file}...`);

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`  ${file} aplicada com sucesso.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("Migrações finalizadas.");
}

deployMigrations()
  .catch((error) => {
    console.error("Falha ao aplicar migrações:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
