import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare module "fastify" {
  interface FastifyInstance {
    db: Database.Database;
  }
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(moduleDir, "..", "migrations");

export function openDatabase(dataDir: string): Database.Database {
  const db = new Database(path.join(dataDir, "data.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY
    )
  `);

  const applied = new Set(
    db
      .prepare("SELECT filename FROM schema_migrations")
      .all()
      .map((row) => (row as { filename: string }).filename),
  );

  const migrationFiles = readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  const recordMigration = db.prepare(
    "INSERT INTO schema_migrations (filename) VALUES (?)",
  );

  for (const filename of migrationFiles) {
    if (applied.has(filename)) continue;
    const sql = readFileSync(path.join(migrationsDir, filename), "utf8");
    db.transaction(() => {
      db.exec(sql);
      recordMigration.run(filename);
    })();
  }
}
