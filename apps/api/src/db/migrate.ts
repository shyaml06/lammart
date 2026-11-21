import fs from 'fs';
import path from 'path';
import type { Database as DatabaseType } from 'better-sqlite3';
import { getDb, closeDb } from './client';

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Runs pending DDL migrations from the migrations directory.
 */
export function runMigrations(db?: DatabaseType): MigrationResult {
  const database = db || getDb();

  // Ensure schema_migrations table exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Locate migrations directory
  let migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    // Check relative to cwd or src
    migrationsDir = path.resolve(process.cwd(), 'src/db/migrations');
  }
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.resolve(__dirname, '../../src/db/migrations');
  }

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at ${migrationsDir}`);
  }

  // Get applied migrations
  const appliedRows = database.prepare('SELECT version FROM schema_migrations').all() as { version: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  // Read .sql files sorted alphanumerically
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) {
      skipped.push(file);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const applyMigration = database.transaction(() => {
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file);
    });

    applyMigration();
    applied.push(file);
    console.log(`[migrate] Applied migration: ${file}`);
  }

  return { applied, skipped };
}

// If invoked as a CLI script
if (require.main === module || (process.argv[1] && process.argv[1].includes('migrate'))) {
  try {
    console.log('[migrate] Starting database migrations...');
    const result = runMigrations();
    console.log(`[migrate] Completed. Applied: ${result.applied.length}, Skipped: ${result.skipped.length}`);
    if (!process.env.KEEP_DB_OPEN) {
      closeDb();
    }
  } catch (err) {
    console.error('[migrate] Error running migrations:', err);
    process.exit(1);
  }
}
